// apps/marketing/src/app/api/signup/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url) throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL");
  if (!service) throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY");

  return createClient(url, service, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

// Keep subdomain safe + predictable
function normalizeSubdomain(input: string) {
  const s = String(input || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

  // basic safety
  if (!s) return "";
  if (s.length < 2) return "";
  if (s.length > 63) return s.slice(0, 63);
  return s;
}

export async function POST(req: Request) {
  const supabase = getAdminClient();

  const body = await req.json().catch(() => ({} as any));

  // Accept multiple possible names from the client form
  const companyName = String(
    body.companyName ?? body.company_name ?? body.company ?? body.name ?? ""
  ).trim();

  const adminEmail = String(
    body.email ?? body.adminEmail ?? body.admin_email ?? ""
  )
    .trim()
    .toLowerCase();

  const subdomain = normalizeSubdomain(
    body.subdomain ?? body.tenant ?? body.tenantSubdomain ?? ""
  );

  const domain = String(
    body.domain ?? process.env.NEXT_PUBLIC_ROOT_DOMAIN ?? "hi5tech.co.uk"
  )
    .trim()
    .toLowerCase();

  if (!companyName || !adminEmail || !subdomain) {
    return NextResponse.json(
      {
        error: "Missing required fields",
        got: {
          companyName: Boolean(companyName),
          email: Boolean(adminEmail),
          subdomain: Boolean(subdomain),
          keys: Object.keys(body ?? {}),
        },
      },
      { status: 400 }
    );
  }

  // 1) Create tenant
  const trialEndsAtIso = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString();

  const { data: tenant, error: tenantErr } = await supabase
    .from("tenants")
    .insert({
      name: companyName,
      company_name: companyName,
      domain,
      subdomain,
      plan: "trial",
      status: "trial",
      is_active: true,
      trial_ends_at: trialEndsAtIso,
    })
    .select("id, domain, subdomain")
    .single();

  if (tenantErr || !tenant) {
    return NextResponse.json(
      {
        error: tenantErr?.message ?? "Failed to create tenant",
      },
      { status: 400 }
    );
  }

  // 2) Invite admin user
  // IMPORTANT:
  // - redirectTo must be allow-listed in Supabase Redirect URLs
  // - We redirect into /auth/invite (landing page), NOT directly to Supabase confirmation URL
  //   because email scanners can consume OTP links.
  const redirectTo =
    `https://${tenant.subdomain}.${tenant.domain}/auth/callback` +
    `?next=/auth/invite`;

  const { data: inviteData, error: inviteErr } =
    await supabase.auth.admin.inviteUserByEmail(adminEmail, {
      redirectTo,
      data: {
        tenant: tenant.subdomain,
        domain: tenant.domain,
        company: companyName,
      },
    });

  // If invite succeeded, pre-provision profile + membership so login is authorised immediately
if (!inviteErr && inviteData?.user?.id) {
  const userId = inviteData.user.id;

  // Ensure profile exists (id must match auth user id)
  await supabase.from("profiles").upsert(
    {
      id: userId,
      email: adminEmail,
      tenant_id: tenant.id,
      full_name: companyName, // optional
      created_at: new Date().toISOString(),
    },
    { onConflict: "id" }
  );

  // Ensure membership exists
  await supabase.from("memberships").upsert(
    {
      tenant_id: tenant.id,
      user_id: userId,
      role: "admin",
      created_at: new Date().toISOString(),
    },
    { onConflict: "tenant_id,user_id" }
  );
}

  // Best effort — even if invite fails, tenant is created.
  return NextResponse.json({
    ok: true,
    tenant,
    invite: {
      sent: !inviteErr,
      error: inviteErr?.message ?? null,
      userId: inviteData?.user?.id ?? null,
      redirectTo,
    },
  });
}
