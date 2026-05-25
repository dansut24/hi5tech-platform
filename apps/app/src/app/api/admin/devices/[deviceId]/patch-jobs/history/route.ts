import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ deviceId: string }> }
) {
  try {
    const { deviceId } = await context.params;
    const admin = supabaseAdmin();

    const { data: jobs, error } = await admin
      .from("patch_jobs")
      .select(`
        id,
        tenant_id,
        device_id,
        status,
        approved_count,
        total_count,
        created_at,
        started_at,
        finished_at,
        error,
        patch_job_items (
          id,
          software_name,
          vendor,
          installed_version,
          target_version,
          winget_id,
          command,
          status,
          output,
          error,
          created_at,
          started_at,
          finished_at
        )
      `)
      .eq("device_id", deviceId)
      .order("created_at", { ascending: false })
      .limit(20);

    if (error) throw error;

    return NextResponse.json({
      ok: true,
      deviceId,
      jobs: jobs || []
    });
  } catch (error: any) {
    return NextResponse.json(
      { ok: false, error: error.message || "Failed to load patch job history" },
      { status: 500 }
    );
  }
}
