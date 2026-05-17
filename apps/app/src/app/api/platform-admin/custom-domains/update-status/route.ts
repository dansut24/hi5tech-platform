import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { requirePlatformAdmin } from "@/lib/platform-admin/guard";

export const dynamic = "force-dynamic";

type DomainStatus = "pending" | "verified" | "active" | "failed" | "disabled";

function json(status: number, body: any) {
  return NextResponse.json(body, {
    status,
    headers: {
      "cache-control": "no-store",
    },
  });
}

function validStatus(value: unknown): DomainStatus | null {
  const status = String(value ?? "").trim().toLowerCase();

  if (
    status === "pending" ||
    status === "verified" ||
    status === "active" ||
    status === "failed" ||
    status === "disabled"
  ) {
    return status;
  }

  return null;
}

export async function POST(req: Request) {
  try {
    const platformAdmin = await requirePlatformAdmin();

    const body = await req.json().catch(() => null);
    const domainId = String(body?.domainId ?? "").trim();
    const status = validStatus(body?.status);

    if (!domainId) {
      return json(400, { error: "Domain ID is required." });
    }

    if (!status) {
      return json(400, { error: "Invalid domain status." });
    }

    const admin = supabaseAdmin();

    const update: Record<string, any> = {
      status,
      updated_at: new Date().toISOString(),
    };

    if (status === "verified") {
      update.verified_at = new Date().toISOString();
    }

    if (status === "active") {
      update.verified_at = new Date().toISOString();
      update.activated_at = new Date().toISOString();
    }

    if (status === "pending") {
      update.verified_at = null;
      update.activated_at = null;
    }

    if (status === "failed" || status === "disabled") {
      update.activated_at = null;
    }

    const { data: domain, error } = await admin
      .from("tenant_custom_domains")
      .update(update)
      .eq("id", domainId)
      .select("*")
      .single();

    if (error || !domain) {
      return json(400, {
        error: error?.message || "Failed to update domain.",
      });
    }

    await admin.from("platform_admin_audit_log").insert({
      actor_user_id: platformAdmin.userId,
      actor_email: platformAdmin.email,
      action: "tenant_custom_domain_status_updated",
      target_type: "tenant_custom_domain",
      target_id: domain.id,
      metadata: {
        domain: domain.domain,
        tenant_id: domain.tenant_id,
        status,
      },
    });

    return json(200, {
      ok: true,
      domain,
    });
  } catch (err) {
    return json(400, {
      error: err instanceof Error ? err.message : "Failed to update custom domain.",
    });
  }
}
