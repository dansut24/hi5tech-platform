import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import {
  completeTenantWorkspaceFromIntent,
  type OnboardingProduct,
} from "@/lib/onboarding/create-tenant-workspace";

export const dynamic = "force-dynamic";

type InviteInput = {
  email?: string;
  role?: string;
};

function json(status: number, body: any) {
  return NextResponse.json(body, {
    status,
    headers: {
      "cache-control": "no-store",
    },
  });
}

function cleanEmail(value: unknown) {
  return String(value ?? "").trim().toLowerCase();
}

function cleanText(value: unknown, fallback = "") {
  const text = String(value ?? "").trim();
  return text || fallback;
}

function validAppearance(value: string) {
  return ["light", "dark", "system"].includes(value) ? value : "system";
}

function validAccent(value: string) {
  return ["violet", "blue", "emerald", "rose", "orange"].includes(value) ? value : "violet";
}

function validInviteRole(value: string) {
  return ["admin", "technician", "viewer"].includes(value) ? value : "technician";
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
    const timezone = cleanText(body?.timezone, "Europe/London");
    const region = cleanText(body?.region, "United Kingdom");
    const companyName = cleanText(body?.companyName);
    const supportEmail = cleanEmail(body?.supportEmail);
    const accentColor = validAccent(String(body?.accentColor ?? "violet"));
    const appearance = validAppearance(String(body?.appearance ?? "system"));
    const useItsmDefaults = body?.useItsmDefaults !== false;
    const useControlDefaults = body?.useControlDefaults !== false;
    const invites = Array.isArray(body?.invites) ? (body.invites as InviteInput[]) : [];

    if (!["itsm", "control", "both"].includes(product)) {
      return json(400, { error: "Invalid product selection" });
    }

    if (!companyName || companyName.length < 2) {
      return json(400, { error: "Company name is required" });
    }

    if (!supportEmail || !supportEmail.includes("@")) {
      return json(400, { error: "A valid support email is required" });
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
      intent: {
        ...intent,
        company_name: companyName,
      },
      userId: user.id,
      email: user.email || intent.admin_email,
      product,
      timezone,
      setup: {
        companyName,
        supportEmail,
        region,
        accentColor,
        appearance,
        useItsmDefaults,
        useControlDefaults,
        invites: invites
          .map((invite) => ({
            email: cleanEmail(invite.email),
            role: validInviteRole(String(invite.role ?? "technician")),
          }))
          .filter((invite) => invite.email && invite.email.includes("@")),
      },
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
