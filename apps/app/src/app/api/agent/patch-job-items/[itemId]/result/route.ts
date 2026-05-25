import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

const allowedStatuses = ["running", "success", "failed"];

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ itemId: string }> }
) {
  try {
    const { itemId } = await context.params;
    const body = await request.json();

    const status = String(body.status || "").toLowerCase();

    if (!allowedStatuses.includes(status)) {
      return NextResponse.json(
        { ok: false, error: "Invalid status" },
        { status: 400 }
      );
    }

    const admin = supabaseAdmin();

    const update: any = {
      status,
      output: body.output || null,
      error: body.error || null
    };

    if (status === "running") {
      update.started_at = new Date().toISOString();
    }

    if (status === "success" || status === "failed") {
      update.finished_at = new Date().toISOString();
    }

    const { data: item, error } = await admin
      .from("patch_job_items")
      .update(update)
      .eq("id", itemId)
      .select("*")
      .single();

    if (error) throw error;

    await refreshParentJobStatus(item.job_id);

    return NextResponse.json({
      ok: true,
      item
    });
  } catch (error: any) {
    return NextResponse.json(
      { ok: false, error: error.message || "Failed to update patch job item" },
      { status: 500 }
    );
  }
}

async function refreshParentJobStatus(jobId: string) {
  const admin = supabaseAdmin();

  const { data: items, error } = await admin
    .from("patch_job_items")
    .select("status")
    .eq("job_id", jobId);

  if (error) throw error;

  const statuses = (items || []).map((item) => item.status);

  let status = "pending";

  if (statuses.some((value) => value === "running")) {
    status = "running";
  } else if (statuses.length > 0 && statuses.every((value) => value === "success")) {
    status = "success";
  } else if (statuses.some((value) => value === "failed")) {
    status = "failed";
  }

  const update: any = { status };

  if (status === "running") {
    update.started_at = new Date().toISOString();
  }

  if (status === "success" || status === "failed") {
    update.finished_at = new Date().toISOString();
  }

  await admin.from("patch_jobs").update(update).eq("id", jobId);
}
