import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { requirePlatformAdmin } from "@/lib/platform-admin/guard";

export const dynamic = "force-dynamic";

function json(status: number, body: any) {
  return NextResponse.json(body, {
    status,
    headers: {
      "cache-control": "no-store",
    },
  });
}

function validDays(value: unknown) {
  const days = Number(value);

  if (!Number.isFinite(days)) return null;
  if (![7, 14, 30, 60, 90].includes(days)) return null;

  return days;
}

function addDays(date: Date, days: number) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

export async function POST(req: Request) {
  try {
    const platformAdmin = await requirePlatformAdmin();

    const body = await req.json().catch(() => null);
    const tenantId = String(body?.tenantId ?? "").trim();
    const days = validDays(body?.days);
    const note = String(body?.note ?? "").trim();

    if (!tenantId) {
      return json(400, { error: "Tenant ID is required." });
    }

    if (!days) {
      return json(400, { error: "Invalid trial extension." });
    }

    const admin = supabaseAdmin();

    const { data: tenantBefore, error: tenantLoadError } = await admin
      .from("tenants")
      .select("id, name, company_name, subdomain, domain, status, plan, is_active, trial_ends_at")
      .eq("id", tenantId)
      .maybeSingle();

    if (tenantLoadError || !tenantBefore?.id) {
      return json(404, {
        error: tenantLoadError?.message || "Tenant not found.",
      });
    }

    const currentTrialEnd = tenantBefore.trial_ends_at
      ? new Date(tenantBefore.trial_ends_at)
      : new Date();

    const baseDate =
      Number.isNaN(currentTrialEnd.getTime()) || currentTrialEnd.getTime() < Date.now()
        ? new Date()
        : currentTrialEnd;

    const newTrialEnd = addDays(baseDate, days).toISOString();
    const now = new Date().toISOString();

    const { data: tenant, error: tenantUpdateError } = await admin
      .from("tenants")
      .update({
        status: "trial",
        plan: tenantBefore.plan || "trial",
        is_active: true,
        trial_ends_at: newTrialEnd,
        updated_at: now,
      })
      .eq("id", tenantId)
      .select("id, name, company_name, subdomain, domain, status, plan, is_active, trial_ends_at, updated_at")
      .single();

    if (tenantUpdateError || !tenant) {
      return json(400, {
        error: tenantUpdateError?.message || "Failed to extend trial.",
      });
    }

    await admin
      .from("tenant_billing_profiles")
      .update({
        billing_status: "trial",
        trial_ends_at: newTrialEnd,
        updated_at: now,
      })
      .eq("tenant_id", tenantId);

    await admin.from("platform_admin_audit_log").insert({
      actor_user_id: platformAdmin.userId,
      actor_email: platformAdmin.email,
      action: "tenant_trial_extended",
      target_type: "tenant",
      target_id: tenantId,
      metadata: {
        days,
        note,
        before: {
          trial_ends_at: tenantBefore.trial_ends_at,
          status: tenantBefore.status,
          plan: tenantBefore.plan,
          is_active: tenantBefore.is_active,
        },
        after: {
          trial_ends_at: tenant.trial_ends_at,
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
      error: err instanceof Error ? err.message : "Failed to extend trial.",
    });
  }
}
