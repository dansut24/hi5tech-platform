import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ deviceId: string }> }
) {
  try {
    const { deviceId } = await context.params;
    const admin = supabaseAdmin();

    const { data, error } = await admin
      .from("patch_job_items")
      .select(
        "id, job_id, device_id, software_name, vendor, installed_version, target_version, winget_id, command, execution, status, created_at"
      )
      .eq("device_id", deviceId)
      .eq("status", "pending")
      .order("created_at", { ascending: true })
      .limit(10);

    if (error) throw error;

    return NextResponse.json({
      ok: true,
      deviceId,
      count: data?.length || 0,
      items: data || []
    });
  } catch (error: any) {
    return NextResponse.json(
      { ok: false, error: error.message || "Failed to get pending patch jobs" },
      { status: 500 }
    );
  }
}
