import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

function asArray(value: any): any[] {
  return Array.isArray(value) ? value : [];
}

function defaultScanSchedule() {
  return {
    enabled: true,
    frequency: "daily",
    time: "10:00",
    timezone: "Europe/London"
  };
}

function defaultPatchSchedule() {
  return {
    enabled: true,
    frequency: "daily",
    time: "15:00",
    timezone: "Europe/London"
  };
}

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const tenantId =
      url.searchParams.get("tenant_id") ||
      "bff625ff-230d-4362-8963-3709d1a785b9";

    const admin = supabaseAdmin();

    const { data, error } = await admin
      .from("software_patch_policies")
      .select(
        `
        *,
        items:software_patch_policy_items(*),
        targets:software_patch_policy_targets(*)
      `
      )
      .eq("tenant_id", tenantId)
      .order("created_at", { ascending: false });

    if (error) throw error;

    return NextResponse.json({
      ok: true,
      tenantId,
      count: data?.length || 0,
      policies: data || []
    });
  } catch (error: any) {
    return NextResponse.json(
      { ok: false, error: error.message || "Failed to list software patch policies" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const admin = supabaseAdmin();

    const tenantId =
      body.tenantId ||
      body.tenant_id ||
      "bff625ff-230d-4362-8963-3709d1a785b9";

    const name = String(body.name || "Default software patch policy").trim();

    const { data: policy, error: policyError } = await admin
      .from("software_patch_policies")
      .insert({
        tenant_id: tenantId,
        name,
        enabled: body.enabled ?? true,
        scan_schedule: body.scanSchedule || body.scan_schedule || defaultScanSchedule(),
        patch_schedule: body.patchSchedule || body.patch_schedule || defaultPatchSchedule(),
        offline_mode: body.offlineMode || body.offline_mode || "run_when_online",
        reboot_mode: body.rebootMode || body.reboot_mode || "no_reboot",
        updated_at: new Date().toISOString()
      })
      .select("*")
      .single();

    if (policyError) throw policyError;

    const items = asArray(body.items);
    const targets = asArray(body.targets);

    if (items.length > 0) {
      const itemRows = items
        .filter((item: any) => item.wingetId || item.winget_id)
        .map((item: any) => ({
          policy_id: policy.id,
          winget_id: item.wingetId || item.winget_id,
          software_name: item.softwareName || item.software_name || item.name || "",
          vendor: item.vendor || "",
          enabled: item.enabled ?? true,
          auto_approve: item.autoApprove ?? item.auto_approve ?? true
        }));

      if (itemRows.length > 0) {
        const { error: itemsError } = await admin
          .from("software_patch_policy_items")
          .insert(itemRows);

        if (itemsError) throw itemsError;
      }
    }

    if (targets.length > 0) {
      const targetRows = targets
        .filter((target: any) => target.targetId || target.target_id)
        .map((target: any) => ({
          policy_id: policy.id,
          target_type: target.targetType || target.target_type || "device",
          target_id: target.targetId || target.target_id
        }));

      if (targetRows.length > 0) {
        const { error: targetsError } = await admin
          .from("software_patch_policy_targets")
          .insert(targetRows);

        if (targetsError) throw targetsError;
      }
    }

    return NextResponse.json({
      ok: true,
      policyId: policy.id,
      policy
    });
  } catch (error: any) {
    return NextResponse.json(
      { ok: false, error: error.message || "Failed to create software patch policy" },
      { status: 500 }
    );
  }
}
