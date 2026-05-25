import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

function buildDefaultWingetFallback(item: any) {
  const wingetId = item.matchedWingetId || item.source?.packageId || "";

  if (!wingetId) return null;

  const command = `winget upgrade --id ${wingetId} --silent --accept-package-agreements --accept-source-agreements`;

  return {
    sourceType: "winget",
    sourceName: "WinGet fallback",
    trusted: true,
    verified: true,
    sourcePriority: 10,
    reliabilityScore: 75,
    fallbackOrder: 3,
    requiresPackageManager: true,
    packageManager: "winget",
    packageId: wingetId,
    version: item.latestVersion || "",
    command,
    execution: {
      executionType: "winget",
      command,
      installCommand: command,
      downloadUrl: "",
      localFileName: "",
      verifySha256: "",
      requiresDownload: false,
      sourcePriority: 10,
      reliabilityScore: 75,
      fallbackOrder: 3,
      requiresPackageManager: true,
      packageManager: "winget"
    }
  };
}

function buildExecutionPayload(item: any) {
  const source = item.source || {};
  const execution = source.execution || {};
  const fallbackSource = source.fallbackSource || buildDefaultWingetFallback(item);

  return {
    ...execution,
    sourceType: source.sourceType || "",
    sourceName: source.sourceName || "",
    packageSource: item.patchPackage?.packageSource || source.sourceType || "",
    packageName: item.patchPackage?.packageName || source.sourceName || "",
    packageVersion: item.patchPackage?.version || source.version || "",
    wingetId: item.matchedWingetId || source.packageId || "",
    sourcePriority: source.sourcePriority ?? execution.sourcePriority ?? 100,
    reliabilityScore: source.reliabilityScore ?? execution.reliabilityScore ?? 50,
    fallbackOrder: source.fallbackOrder ?? execution.fallbackOrder ?? 100,
    requiresPackageManager: Boolean(
      source.requiresPackageManager ?? execution.requiresPackageManager
    ),
    packageManager: source.packageManager || execution.packageManager || null,
    fallbackSource
  };
}

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
            sourceType: "vendor",
            sourceName: "Google Chrome Enterprise MSI",
            sourcePriority: 1,
            reliabilityScore: 95,
            fallbackOrder: 1,
            requiresPackageManager: false,
            packageManager: null,
            execution: {
              executionType: "download_and_install",
              command:
                "msiexec /i \"googlechromestandaloneenterprise64.msi\" /qn /norestart",
              downloadUrl:
                "https://dl.google.com/chrome/install/googlechromestandaloneenterprise64.msi",
              installCommand:
                "msiexec /i \"googlechromestandaloneenterprise64.msi\" /qn /norestart",
              requiresDownload: true
            }
          },
          patchPackage: {
            packageSource: "vendor",
            packageName: "Google Chrome Enterprise MSI",
            version: "149.0.7827.22"
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

    const rows = approvedItems.map((item: any) => {
      const execution = buildExecutionPayload(item);

      return {
        job_id: job.id,
        device_id: deviceId,
        software_name: item.name,
        vendor: item.vendor || "",
        installed_version: item.installedVersion || "",
        target_version: item.latestVersion || "",
        winget_id: item.matchedWingetId || execution.wingetId || "",
        command: execution.command || "",
        execution,
        status: "pending"
      };
    });

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
