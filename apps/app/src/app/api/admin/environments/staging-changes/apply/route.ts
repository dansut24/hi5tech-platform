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
      error: "Changes can only be applied from the staging environment.",
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

export async function POST() {
  try {
    const access = await requireStagingTenantAdmin();

    if (!access.ok) {
      return json(access.status, { error: access.error });
    }

    const admin = supabaseAdmin();
    const tenantId = access.resolved.tenantId;

    const { data: productionEnvironment } = await admin
      .from("tenant_environments")
      .select("id")
      .eq("tenant_id", tenantId)
      .eq("key", "production")
      .maybeSingle();

    if (!productionEnvironment?.id) {
      return json(400, { error: "Production environment row is missing." });
    }

    const { data: changes } = await admin
      .from("tenant_environment_change_requests")
      .select("*")
      .eq("tenant_id", tenantId)
      .eq("source_environment_key", "staging")
      .eq("target_environment_key", "production")
      .in("status", ["selected", "scheduled"])
      .order("created_at", { ascending: true });

    const selectedChanges = changes ?? [];

    if (!selectedChanges.length) {
      return json(400, { error: "No selected staging changes to apply." });
    }

    const now = new Date().toISOString();

    for (const change of selectedChanges) {
      if (change.change_type !== "feature" || !change.feature_key) {
        continue;
      }

      const targetStatus = change.action === "enable" ? "live" : "disabled";
      const enabled = change.action === "enable";

      await admin.from("tenant_feature_states").upsert(
        {
          tenant_id: tenantId,
          tenant_environment_id: productionEnvironment.id,
          feature_key: change.feature_key,
          status: targetStatus,
          config_json: {},
          layout_json: {},
          updated_by: access.userId,
          updated_at: now,
        },
        {
          onConflict: "tenant_environment_id,feature_key",
        }
      );

      await admin.from("tenant_entitlements").upsert(
        {
          tenant_id: tenantId,
          feature_key: change.feature_key,
          enabled,
          updated_at: now,
        },
        {
          onConflict: "tenant_id,feature_key",
        }
      );

      await admin
        .from("tenant_environment_change_requests")
        .update({
          status: "applied",
          applied_at: now,
          updated_at: now,
        })
        .eq("id", change.id);
    }

    return json(200, {
      ok: true,
      applied: selectedChanges.length,
    });
  } catch (err) {
    return json(400, {
      error: err instanceof Error ? err.message : "Failed to apply staging changes.",
    });
  }
}
