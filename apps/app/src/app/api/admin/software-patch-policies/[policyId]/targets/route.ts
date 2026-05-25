import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

function asArray(value: any): any[] {
  return Array.isArray(value) ? value : [];
}

function normaliseTarget(target: any, policyId: string) {
  return {
    policy_id: policyId,
    target_type: target.targetType || target.target_type || "device",
    target_id: String(target.targetId || target.target_id || "").trim()
  };
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ policyId: string }> }
) {
  try {
    const { policyId } = await context.params;
    const admin = supabaseAdmin();

    const { data, error } = await admin
      .from("software_patch_policy_targets")
      .select("*")
      .eq("policy_id", policyId)
      .order("created_at", { ascending: true });

    if (error) throw error;

    return NextResponse.json({
      ok: true,
      policyId,
      count: data?.length || 0,
      targets: data || []
    });
  } catch (error: any) {
    return NextResponse.json(
      { ok: false, error: error.message || "Failed to list policy targets" },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ policyId: string }> }
) {
  try {
    const { policyId } = await context.params;
    const body = await request.json();
    const admin = supabaseAdmin();

    const incomingTargets = asArray(body.targets).length > 0
      ? asArray(body.targets)
      : [body];

    const rows = incomingTargets
      .map((target: any) => normaliseTarget(target, policyId))
      .filter((target: any) => target.target_id);

    if (rows.length === 0) {
      return NextResponse.json(
        { ok: false, error: "No valid targets supplied" },
        { status: 400 }
      );
    }

    const { data, error } = await admin
      .from("software_patch_policy_targets")
      .insert(rows)
      .select("*");

    if (error) throw error;

    return NextResponse.json({
      ok: true,
      policyId,
      added: data?.length || 0,
      targets: data || []
    });
  } catch (error: any) {
    return NextResponse.json(
      { ok: false, error: error.message || "Failed to add policy target" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ policyId: string }> }
) {
  try {
    const { policyId } = await context.params;
    const body = await request.json();
    const admin = supabaseAdmin();

    const targetId = body.targetRowId || body.id;

    if (!targetId) {
      return NextResponse.json(
        { ok: false, error: "targetRowId or id is required" },
        { status: 400 }
      );
    }

    const updates: any = {};

    if (body.targetType !== undefined || body.target_type !== undefined) {
      updates.target_type = body.targetType || body.target_type;
    }

    if (body.targetId !== undefined || body.target_id !== undefined) {
      updates.target_id = body.targetId || body.target_id;
    }

    const { data, error } = await admin
      .from("software_patch_policy_targets")
      .update(updates)
      .eq("id", targetId)
      .eq("policy_id", policyId)
      .select("*")
      .single();

    if (error) throw error;

    return NextResponse.json({
      ok: true,
      policyId,
      target: data
    });
  } catch (error: any) {
    return NextResponse.json(
      { ok: false, error: error.message || "Failed to update policy target" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ policyId: string }> }
) {
  try {
    const { policyId } = await context.params;
    const url = new URL(request.url);
    const body = await request.json().catch(() => ({}));
    const admin = supabaseAdmin();

    const targetRowId =
      body.targetRowId || body.id || url.searchParams.get("target_row_id");

    const targetId =
      body.targetId || body.target_id || url.searchParams.get("target_id");

    if (!targetRowId && !targetId) {
      return NextResponse.json(
        { ok: false, error: "targetRowId or targetId is required" },
        { status: 400 }
      );
    }

    let query = admin
      .from("software_patch_policy_targets")
      .delete()
      .eq("policy_id", policyId);

    if (targetRowId) {
      query = query.eq("id", targetRowId);
    } else {
      query = query.eq("target_id", targetId);
    }

    const { error } = await query;

    if (error) throw error;

    return NextResponse.json({
      ok: true,
      policyId,
      deleted: true
    });
  } catch (error: any) {
    return NextResponse.json(
      { ok: false, error: error.message || "Failed to delete policy target" },
      { status: 500 }
    );
  }
}
