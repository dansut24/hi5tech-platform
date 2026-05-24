import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ deviceId: string }> }
) {
  const { deviceId } = await context.params;

  return NextResponse.json({
    ok: true,
    message: "Patch jobs endpoint is online. Use POST with approved patch-plan items.",
    deviceId,
    exampleBody: {
      tenantId: "bff625ff-230d-4362-8963-3709d1a785b9",
      items: [
        {
          name: "Google Chrome",
          vendor: "Google LLC",
          installedVersion: "148.0.7778.179",
          latestVersion: "149.0.7827.22",
          matchedWingetId: "Google.Chrome",
          updateAvailable: true,
          approved: true,
          source: {
            execution: {
              executionType: "winget",
              command:
                "winget upgrade --id Google.Chrome --silent --accept-package-agreements --accept-source-agreements",
              installCommand:
                "winget upgrade --id Google.Chrome --silent --accept-package-agreements --accept-source-agreements",
              requiresDownload: false
            }
          }
        }
      ]
    }
  });
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ deviceId: string }> }
) {
  try {
    const { deviceId } = await context.params;
    const body = await request.json();

    const tenantId = body.tenantId || "bff625ff-230d-4362-8963-3709d1a785b9";
    const items = Array.isArray(body.items) ? body.items : [];

    const approvedItems = items.filter(
      (item: any) =>
        item.approved &&
        item.updateAvailable &&
        item.source?.execution?.command
    );

    if (approvedItems.length === 0) {
      return NextResponse.json(
        { ok: false, error: "No approved patch items with executable commands" },
        { status: 400 }
      );
    }

    const admin = supabaseAdmin();

    const { data: job, error: jobError } = await admin
      .from("patch_jobs")
      .insert({
        tenant_id: tenantId,
        device_id: deviceId,
        status: "pending",
        approved_count: approvedItems.length,
        total_count: approvedItems.length
      })
      .select("*")
      .single();

    if (jobError) throw jobError;

    const rows = approvedItems.map((item: any) => ({
      job_id: job.id,
      device_id: deviceId,
      software_name: item.name,
      vendor: item.vendor || "",
      installed_version: item.installedVersion || "",
      target_version: item.latestVersion || "",
      winget_id: item.matchedWingetId || "",
      command: item.source.execution.command,
      execution: item.source.execution,
      status: "pending"
    }));

    const { error: itemsError } = await admin
      .from("patch_job_items")
      .insert(rows);

    if (itemsError) throw itemsError;

    return NextResponse.json({
      ok: true,
      jobId: job.id,
      deviceId,
      queued: rows.length,
      status: "pending"
    });
  } catch (error: any) {
    return NextResponse.json(
      { ok: false, error: error.message || "Failed to create patch job" },
      { status: 500 }
    );
  }
}
