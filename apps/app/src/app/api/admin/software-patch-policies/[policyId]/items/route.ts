import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

function asArray(value: any): any[] {
  return Array.isArray(value) ? value : [];
}

function normaliseItem(item: any, policyId: string) {
  const wingetId = String(item.wingetId || item.winget_id || "").trim();

  return {
    policy_id: policyId,
    winget_id: wingetId,
    software_name: item.softwareName || item.software_name || item.name || wingetId,
    vendor: item.vendor || "",
    enabled: item.enabled ?? true,
    auto_approve: item.autoApprove ?? item.auto_approve ?? true
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
      .from("software_patch_policy_items")
      .select("*")
      .eq("policy_id", policyId)
      .order("software_name", { ascending: true });

    if (error) throw error;

    return NextResponse.json({
      ok: true,
      policyId,
      count: data?.length || 0,
      items: data || []
    });
  } catch (error: any) {
    return NextResponse.json(
      { ok: false, error: error.message || "Failed to list policy items" },
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

    const incomingItems = asArray(body.items).length > 0 ? asArray(body.items) : [body];

    const rows = incomingItems
      .map((item: any) => normaliseItem(item, policyId))
      .filter((item: any) => item.winget_id);

    if (rows.length === 0) {
      return NextResponse.json(
        { ok: false, error: "No valid software items supplied" },
        { status: 400 }
      );
    }

    const { data, error } = await admin
      .from("software_patch_policy_items")
      .insert(rows)
      .select("*");

    if (error) throw error;

    return NextResponse.json({
      ok: true,
      policyId,
      added: data?.length || 0,
      items: data || []
    });
  } catch (error: any) {
    return NextResponse.json(
      { ok: false, error: error.message || "Failed to add policy item" },
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

    const itemId = body.itemId || body.id;

    if (!itemId) {
      return NextResponse.json(
        { ok: false, error: "itemId is required" },
        { status: 400 }
      );
    }

    const updates: any = {};

    if (body.wingetId !== undefined || body.winget_id !== undefined) {
      updates.winget_id = body.wingetId || body.winget_id;
    }

    if (
      body.softwareName !== undefined ||
      body.software_name !== undefined ||
      body.name !== undefined
    ) {
      updates.software_name =
        body.softwareName || body.software_name || body.name;
    }

    if (body.vendor !== undefined) updates.vendor = body.vendor;
    if (body.enabled !== undefined) updates.enabled = Boolean(body.enabled);

    if (body.autoApprove !== undefined || body.auto_approve !== undefined) {
      updates.auto_approve = Boolean(body.autoApprove ?? body.auto_approve);
    }

    const { data, error } = await admin
      .from("software_patch_policy_items")
      .update(updates)
      .eq("id", itemId)
      .eq("policy_id", policyId)
      .select("*")
      .single();

    if (error) throw error;

    return NextResponse.json({
      ok: true,
      policyId,
      item: data
    });
  } catch (error: any) {
    return NextResponse.json(
      { ok: false, error: error.message || "Failed to update policy item" },
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

    const itemId = body.itemId || body.id || url.searchParams.get("item_id");
    const wingetId = body.wingetId || body.winget_id || url.searchParams.get("winget_id");

    if (!itemId && !wingetId) {
      return NextResponse.json(
        { ok: false, error: "itemId or wingetId is required" },
        { status: 400 }
      );
    }

    let query = admin
      .from("software_patch_policy_items")
      .delete()
      .eq("policy_id", policyId);

    if (itemId) {
      query = query.eq("id", itemId);
    } else {
      query = query.eq("winget_id", wingetId);
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
      { ok: false, error: error.message || "Failed to delete policy item" },
      { status: 500 }
    );
  }
}
