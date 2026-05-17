import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { getActiveTenantId } from "@/lib/tenant";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import {
  CUSTOM_DOMAIN_DNS_TARGET,
  customDomainCnameRecord,
  customDomainVerificationRecord,
  isValidCustomDomain,
  normaliseCustomDomain,
} from "@/lib/tenant/custom-domains";

export const dynamic = "force-dynamic";

function json(status: number, body: any) {
  return NextResponse.json(body, {
    status,
    headers: {
      "cache-control": "no-store",
    },
  });
}

async function requireTenantAdmin(tenantId: string) {
  const supabase = await supabaseServer();

  const { data: userRes } = await supabase.auth.getUser();
  const user = userRes.user;

  if (!user) {
    return { ok: false as const, status: 401, error: "Not authenticated", userId: null };
  }

  const { data: membership } = await supabase
    .from("memberships")
    .select("role")
    .eq("tenant_id", tenantId)
    .eq("user_id", user.id)
    .maybeSingle();

  const role = String(membership?.role || "");

  if (!["owner", "admin", "billing_admin"].includes(role)) {
    return { ok: false as const, status: 403, error: "Admin access required", userId: user.id };
  }

  return { ok: true as const, userId: user.id, role };
}

export async function GET() {
  try {
    const tenantId = await getActiveTenantId();
    const access = await requireTenantAdmin(tenantId);

    if (!access.ok) {
      return json(access.status, { error: access.error });
    }

    const admin = supabaseAdmin();

    const { data, error } = await admin
      .from("tenant_custom_domains")
      .select("*")
      .eq("tenant_id", tenantId)
      .order("created_at", { ascending: false });

    if (error) {
      return json(400, { error: error.message });
    }

    return json(200, {
      domains: data ?? [],
      dnsTarget: CUSTOM_DOMAIN_DNS_TARGET,
    });
  } catch (err) {
    return json(400, {
      error: err instanceof Error ? err.message : "Failed to load custom domains",
    });
  }
}

export async function POST(req: Request) {
  try {
    const tenantId = await getActiveTenantId();
    const access = await requireTenantAdmin(tenantId);

    if (!access.ok) {
      return json(access.status, { error: access.error });
    }

    const body = await req.json().catch(() => null);
    const domain = normaliseCustomDomain(body?.domain);
    const environmentKey = String(body?.environmentKey || "production");

    if (!isValidCustomDomain(domain)) {
      return json(400, { error: "Enter a valid domain, for example support.example.com." });
    }

    if (!["production", "test", "staging"].includes(environmentKey)) {
      return json(400, { error: "Invalid environment." });
    }

    if (domain.endsWith(".hi5tech.co.uk") || domain === "hi5tech.co.uk") {
      return json(400, {
        error: "Hi5Tech domains are managed automatically. Please use an external custom domain.",
      });
    }

    const admin = supabaseAdmin();

    const verificationToken = `hi5tech-domain-verification=${randomUUID()}`;

    const { data, error } = await admin
      .from("tenant_custom_domains")
      .insert({
        tenant_id: tenantId,
        domain,
        environment_key: environmentKey,
        status: "pending",
        verification_token: verificationToken,
        verification_method: "dns_txt",
        dns_target: CUSTOM_DOMAIN_DNS_TARGET,
        created_by: access.userId,
        updated_at: new Date().toISOString(),
      })
      .select("*")
      .single();

    if (error) {
      if (error.message.toLowerCase().includes("duplicate")) {
        return json(409, { error: "That custom domain is already registered." });
      }

      return json(400, { error: error.message });
    }

    return json(200, {
      ok: true,
      domain: data,
      dns: {
        cname: customDomainCnameRecord(domain),
        txt: customDomainVerificationRecord(domain, verificationToken),
      },
    });
  } catch (err) {
    return json(400, {
      error: err instanceof Error ? err.message : "Failed to add custom domain",
    });
  }
}
