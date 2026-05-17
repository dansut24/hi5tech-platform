import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { getActiveTenantId } from "@/lib/tenant";
import { createBillingChange, getTenantBillingProfile } from "@/lib/billing/tenant-billing";
import { normalisePlanKey } from "@/lib/billing/pricing";

export const dynamic = "force-dynamic";

function json(status: number, body: any) {
  return NextResponse.json(body, {
    status,
    headers: {
      "cache-control": "no-store",
    },
  });
}

export async function POST(req: Request) {
  try {
    const supabase = await supabaseServer();

    const { data: userRes, error: userError } = await supabase.auth.getUser();
    const user = userRes.user;

    if (userError || !user) {
      return json(401, { error: "Not authenticated" });
    }

    const tenantId = await getActiveTenantId();

    const { data: membership } = await supabase
      .from("memberships")
      .select("role")
      .eq("tenant_id", tenantId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (membership?.role !== "owner" && membership?.role !== "billing_admin") {
      return json(403, { error: "Only the workspace owner or billing admin can request upgrades." });
    }

    const body = await req.json().catch(() => null);
    const requestedPlan = normalisePlanKey(body?.plan);

    const billingResult = await getTenantBillingProfile(tenantId);
    const currentPlan = billingResult.plan;

    if (requestedPlan === currentPlan.key) {
      return json(400, { error: "You are already on this plan." });
    }

    if (currentPlan.key === "both" || currentPlan.key === "platform") {
      return json(400, { error: "You are already on the full platform plan." });
    }

    const change = await createBillingChange({
      tenantId,
      fromPlan: currentPlan.key,
      toPlan: requestedPlan,
      createdBy: user.id,
    });

    return json(200, {
      ok: true,
      change,
      redirectTo: "/admin/billing",
    });
  } catch (err) {
    return json(400, {
      error: err instanceof Error ? err.message : "Failed to request upgrade",
    });
  }
}
