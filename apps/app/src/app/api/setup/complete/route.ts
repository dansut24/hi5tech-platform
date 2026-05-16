import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import {
  completeTenantWorkspaceFromIntent,
  type OnboardingProduct,
} from "@/lib/onboarding/create-tenant-workspace";

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

    if (userError || !userRes.user) {
      return json(401, { error: "Not authenticated" });
    }

    const user = userRes.user;
    const body = await req.json().catch(() => null);

    const product = String(body?.product ?? "both") as OnboardingProduct;
    const timezone = String(body?.timezone ?? "Europe/London").trim() || "Europe/London";

    if (!["itsm", "control", "both"].includes(product)) {
      return json(400, { error: "Invalid product selection" });
    }

    const { data: existingMembership } = await supabase
      .from("memberships")
      .select("tenant_id")
      .eq("user_id", user.id)
      .limit(1)
      .maybeSingle();

    if (existingMembership?.tenant_id) {
      return json(200, {
        ok: true,
        redirectTo: "/apps",
      });
    }

    const admin = supabaseAdmin();

    let { data: intent } = await admin
      .from("tenant_signup_intents")
      .select("id, company_name, subdomain, root_domain, admin_name, admin_email, status, auth_user_id, created_tenant_id")
      .eq("auth_user_id", user.id)
      .in("status", ["pending_email", "confirmed"])
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!intent && user.email) {
      const res = await admin
        .from("tenant_signup_intents")
        .select("id, company_name, subdomain, root_domain, admin_name, admin_email, status, auth_user_id, created_tenant_id")
        .eq("admin_email", user.email.toLowerCase())
        .in("status", ["pending_email", "confirmed"])
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      intent = res.data;
    }

    if (!intent) {
      return json(404, { error: "Signup intent not found. Please start signup again." });
    }

    if (intent.status === "pending_email") {
      await admin
        .from("tenant_signup_intents")
        .update({
          status: "confirmed",
          auth_user_id: user.id,
          confirmed_at: new Date().toISOString(),
        })
        .eq("id", intent.id);

      intent.status = "confirmed";
      intent.auth_user_id = user.id;
    }

    const result = await completeTenantWorkspaceFromIntent({
      intent,
      userId: user.id,
      email: user.email || intent.admin_email,
      product,
      timezone,
    });

    const firstPath =
      product === "itsm"
        ? "/itsm"
        : product === "control"
          ? "/control/devices"
          : "/apps";

    return json(200, {
      ok: true,
      ...result,
      redirectTo: `${result.tenantUrl}${firstPath}`,
    });
  } catch (err) {
    return json(400, {
      error: err instanceof Error ? err.message : "Failed to complete setup",
    });
  }
}
