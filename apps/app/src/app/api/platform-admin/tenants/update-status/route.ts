import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { requirePlatformAdmin } from "@/lib/platform-admin/guard";

export const dynamic = "force-dynamic";

type TenantStatusAction = "suspend" | "reactivate" | "mark_trial" | "mark_active";

function json(status: number, body: any) {
  return NextResponse.json(body, {
    status,
    headers: {
      "cache-control": "no-store",
    },
  });
}

function validAction(value: unknown): TenantStatusAction | null {
  const action = String(value ?? "").trim().toLowerCase();

  if (
    action === "suspend" ||
    action === "reactivate" ||
    action === "mark_trial" ||
    action === "mark_active"
  ) {
    return action;
  }

  return null;
}

function getTenantUpdateForAction(action: TenantStatusAction) {
  const now = new Date().toISOString();

  if (action === "suspend") {
    return {
      status: "suspended",
      is_active: false,
      updated_at: now,
    };
  }

  if (action === "reactivate") {
    return {
      status: "active",
      is_active: true,
      updated_at: now,
    };
  }

  if (action === "mark_trial") {
    return {
      status: "trial",
      plan: "trial",
      is_active: true,
      updated_at: now,
    };
  }

  return {
    status: "active",
    is_active: true,
    updated_at: now,
  };
}

function getBillingUpdateForAction(action: TenantStatusAction) {
  const now = new Date().toISOString();

  if (action === "suspend") {
    return {
      billing_status: "suspended",
      updated_at: now,
    };
  }

  if (action === "reactivate") {
    return {
      billing_status: "active",
      updated_at: now,
    };
  }

  if (action === "mark_trial") {
    return {
      billing_status: "trial",
      plan_key: "trial",
      updated_at: now,
    };
  }

  return {
    billing_status: "active",
    updated_at: now,
  };
}

export async function POST(req: Request) {
  try {
    const platformAdmin = await requirePlatformAdmin();

    const body = await req.json().catch(() => null);
    const tenantId = String(body?.tenantId ?? "").trim();
    const action = validAction(body?.action);
    const note = String(body?.note ?? "").trim();

    if (!tenantId) {
      return json(400, { error: "Tenant ID is required." });
    }

    if (!action) {
      return json(400, { error: "Invalid tenant status action." });
    }

    const admin = supabaseAdmin();

    const { data: existingTenant, error: tenantLoadError } = await admin
      .from("tenants")
      .select("id, name, company_name, subdomain, domain, status, plan, is_active")
      .eq("id", tenantId)
      .maybeSingle();

    if (tenantLoadError || !existingTenant?.id) {
      return json(404, {
        error: tenantLoadError?.message || "Tenant not found.",
      });
    }

    const tenantUpdate = getTenantUpdateForAction(action);

    const { data: tenant, error: tenantUpdateError } = await admin
      .from("tenants")
      .update(tenantUpdate)
      .eq("id", tenantId)
      .select("id, name, company_name, subdomain, domain, status, plan, is_active, updated_at")
      .single();

    if (tenantUpdateError || !tenant) {
      return json(400, {
        error: tenantUpdateError?.message || "Failed to update tenant.",
      });
    }

    const billingUpdate = getBillingUpdateForAction(action);

    await admin
      .from("tenant_billing_profiles")
      .update(billingUpdate)
      .eq("tenant_id", tenantId);

    await admin.from("platform_admin_audit_log").insert({
      actor_user_id: platformAdmin.userId,
      actor_email: platformAdmin.email,
      action: `tenant_${action}`,
      target_type: "tenant",
      target_id: tenantId,
      metadata: {
        note,
        before: {
          status: existingTenant.status,
          plan: existingTenant.plan,
          is_active: existingTenant.is_active,
        },
        after: {
          status: tenant.status,
          plan: tenant.plan,
          is_active: tenant.is_active,
        },
        tenant: {
          name: tenant.company_name || tenant.name,
          subdomain: tenant.subdomain,
          domain: tenant.domain,
        },
      },
    });

    return json(200, {
      ok: true,
      tenant,
    });
  } catch (err) {
    return json(400, {
      error: err instanceof Error ? err.message : "Failed to update tenant status.",
    });
  }
}
