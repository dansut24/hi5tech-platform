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
      error: "Changes can only be removed from the staging environment.",
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
    const changeId = String(body?.changeId ?? "").trim();

    if (!changeId) {
      return json(400, { error: "Change ID is required." });
    }

    const admin = supabaseAdmin();
    const tenantId = access.resolved.tenantId;

    const { data: change } = await admin
      .from("tenant_environment_change_requests")
      .select("*")
      .eq("id", changeId)
      .eq("tenant_id", tenantId)
      .in("status", ["selected", "scheduled"])
      .maybeSingle();

    if (!change?.id) {
      return json(404, { error: "Selected change not found." });
    }

    const { data: stagingEnvironment } = await admin
      .from("tenant_environments")
      .select("id")
      .eq("tenant_id", tenantId)
      .eq("key", "staging")
      .maybeSingle();

    await admin
      .from("tenant_environment_change_requests")
      .update({
        status: "cancelled",
        cancelled_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", change.id);

    if (stagingEnvironment?.id && change.feature_key) {
      await admin.from("tenant_feature_states").upsert(
        {
          tenant_id: tenantId,
          tenant_environment_id: stagingEnvironment.id,
          feature_key: change.feature_key,
          status: "available",
          updated_by: access.userId,
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: "tenant_environment_id,feature_key",
        }
      );
    }

    return json(200, {
      ok: true,
    });
  } catch (err) {
    return json(400, {
      error: err instanceof Error ? err.message : "Failed to remove staging change.",
    });
  }
}
