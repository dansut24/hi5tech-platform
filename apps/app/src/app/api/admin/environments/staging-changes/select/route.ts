import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { supabaseServer } from "@/lib/supabase/server";
import { resolveTenantEnvironment } from "@/lib/tenant/environment-host";
import { getFeatureDefinition, isKnownFeatureKey } from "@/lib/environments/feature-catalog";

export const dynamic = "force-dynamic";

type FeatureAction = "enable" | "disable";

function json(status: number, body: any) {
  return NextResponse.json(body, {
    status,
    headers: {
      "cache-control": "no-store",
    },
  });
}

function validAction(value: unknown): FeatureAction | null {
  const action = String(value ?? "").trim().toLowerCase();

  if (action === "enable" || action === "disable") return action;

  return null;
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
      error: "Changes can only be selected from the staging environment.",
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
    const featureKey = String(body?.featureKey ?? "").trim();
    const action = validAction(body?.action);

    if (!isKnownFeatureKey(featureKey)) {
      return json(400, { error: "Unknown feature." });
    }

    if (!action) {
      return json(400, { error: "Invalid change action." });
    }

    const admin = supabaseAdmin();
    const tenantId = access.resolved.tenantId;

    const { data: productionEnvironment } = await admin
      .from("tenant_environments")
      .select("id")
      .eq("tenant_id", tenantId)
      .eq("key", "production")
      .maybeSingle();

    const { data: stagingEnvironment } = await admin
      .from("tenant_environments")
      .select("id")
      .eq("tenant_id", tenantId)
      .eq("key", "staging")
      .maybeSingle();

    if (!productionEnvironment?.id || !stagingEnvironment?.id) {
      return json(400, { error: "Production or staging environment rows are missing." });
    }

    const { data: currentProductionState } = await admin
      .from("tenant_feature_states")
      .select("feature_key, status, config_json, layout_json")
      .eq("tenant_id", tenantId)
      .eq("tenant_environment_id", productionEnvironment.id)
      .eq("feature_key", featureKey)
      .maybeSingle();

    const feature = getFeatureDefinition(featureKey);
    const targetStatus = action === "enable" ? "live" : "disabled";

    const beforeJson = {
      production_status: currentProductionState?.status ?? "missing",
    };

    const afterJson = {
      production_status: targetStatus,
      enabled: action === "enable",
    };

    const summary = `${action === "enable" ? "Enable" : "Disable"} ${feature?.title ?? featureKey}`;
    const description =
      action === "enable"
        ? `Enable ${feature?.title ?? featureKey} in Production.`
        : `Disable ${feature?.title ?? featureKey} in Production.`;

    const { data: change, error } = await admin
      .from("tenant_environment_change_requests")
      .upsert(
        {
          tenant_id: tenantId,
          source_environment_key: "staging",
          target_environment_key: "production",
          change_type: "feature",
          feature_key: featureKey,
          action,
          status: "selected",
          summary,
          description,
          before_json: beforeJson,
          after_json: afterJson,
          created_by: access.userId,
          updated_at: new Date().toISOString(),
          scheduled_for: null,
          applied_at: null,
          cancelled_at: null,
        },
        {
          onConflict:
            "tenant_id,source_environment_key,target_environment_key,change_type,feature_key,status",
        }
      )
      .select("*")
      .single();

    if (error || !change) {
      return json(400, { error: error?.message || "Failed to select change." });
    }

    await admin.from("tenant_feature_states").upsert(
      {
        tenant_id: tenantId,
        tenant_environment_id: stagingEnvironment.id,
        feature_key: featureKey,
        status: "selected",
        updated_by: access.userId,
        updated_at: new Date().toISOString(),
      },
      {
        onConflict: "tenant_environment_id,feature_key",
      }
    );

    return json(200, {
      ok: true,
      change,
    });
  } catch (err) {
    return json(400, {
      error: err instanceof Error ? err.message : "Failed to select staging change.",
    });
  }
}
