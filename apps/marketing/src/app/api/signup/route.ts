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

  const subdomain = String(
    body.subdomain ?? body.tenant ?? body.tenantSubdomain ?? ""
  )
    .trim()
    .toLowerCase();

  const domain = String(
    body.domain ?? process.env.NEXT_PUBLIC_ROOT_DOMAIN ?? "hi5tech.co.uk"
  )
    .trim()
    .toLowerCase();

  if (!companyName || !adminEmail || !subdomain) {
    return NextResponse.json(
      {
        error: "Missing required fields",
        // helpful debug to see what the client actually sent
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
      trial_ends_at: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
    })
    .select("id, domain, subdomain")
    .single();

  if (tenantErr) {
    return NextResponse.json({ error: tenantErr.message }, { status: 400 });
  }

  // Invite (best effort)
  const redirectTo = `https://${tenant.subdomain}.${tenant.domain}/auth/callback`;
  const { data: inviteData, error: inviteErr } =
    await supabase.auth.admin.inviteUserByEmail(adminEmail, { redirectTo });

  return NextResponse.json({
    ok: true,
    tenant,
    invite: {
      sent: !inviteErr,
      error: inviteErr?.message ?? null,
      userId: inviteData?.user?.id ?? null,
    },
  });
}
