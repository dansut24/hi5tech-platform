import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { supabaseServer } from "@/lib/supabase/server";
import { resolveTenantEnvironment } from "@/lib/tenant/environment-host";

export const dynamic = "force-dynamic";

function json(status: number, body: any) {
  return NextResponse.json(body, {
    status,
    headers: {
      "cache-control": "no-store",
    },
  });
}

async function requireStagingTenantAdmin() {
  const resolved = await resolveTenantEnvironment();

  if (!resolved?.tenantId) {
    return { ok: false as const, status: 404, error: "Workspace not found.", resolved: null, userId: null };
  }

  if (resolved.environmentKey !== "staging") {
    return {
      ok: false as const,
      status: 400,
      error: "Changes can only be scheduled from the staging environment.",
      resolved,
      userId: null,
    };
  }

  const supabase = await supabaseServer();
  const { data: userRes } = await supabase.auth.getUser();
  const user = userRes.user;

  if (!user) {
    return { ok: false as const, status: 401, error: "Not authenticated.", resolved, userId: null };
  }

  const { data: membership } = await supabase
    .from("memberships")
    .select("role")
    .eq("tenant_id", resolved.tenantId)
    .eq("user_id", user.id)
    .maybeSingle();

  const role = String(membership?.role || "");

  if (!["owner", "admin", "billing_admin"].includes(role)) {
    return { ok: false as const, status: 403, error: "Admin access required.", resolved, userId: user.id };
  }

  return { ok: true as const, resolved, userId: user.id, role };
}

export async function POST(req: Request) {
  try {
    const access = await requireStagingTenantAdmin();

    if (!access.ok) {
      return json(access.status, { error: access.error });
    }

    const body = await req.json().catch(() => null);
    const rawScheduledFor = String(body?.scheduledFor ?? "").trim();

    if (!rawScheduledFor) {
      return json(400, { error: "Scheduled date/time is required." });
    }

    const scheduledDate = new Date(rawScheduledFor);

    if (Number.isNaN(scheduledDate.getTime())) {
      return json(400, { error: "Invalid scheduled date/time." });
    }

    if (scheduledDate.getTime() <= Date.now()) {
      return json(400, { error: "Scheduled date/time must be in the future." });
    }

    const admin = supabaseAdmin();
    const tenantId = access.resolved.tenantId;

    const { data: changes } = await admin
      .from("tenant_environment_change_requests")
      .select("id")
      .eq("tenant_id", tenantId)
      .eq("source_environment_key", "staging")
      .eq("target_environment_key", "production")
      .eq("status", "selected");

    if (!(changes ?? []).length) {
      return json(400, { error: "No selected changes to schedule." });
    }

    const { error } = await admin
      .from("tenant_environment_change_requests")
      .update({
        status: "scheduled",
        scheduled_for: scheduledDate.toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("tenant_id", tenantId)
      .eq("source_environment_key", "staging")
      .eq("target_environment_key", "production")
      .eq("status", "selected");

    if (error) {
      return json(400, { error: error.message });
    }

    return json(200, {
      ok: true,
      scheduledFor: scheduledDate.toISOString(),
      count: changes?.length ?? 0,
    });
  } catch (err) {
    return json(400, {
      error: err instanceof Error ? err.message : "Failed to schedule staging changes.",
    });
  }
}
