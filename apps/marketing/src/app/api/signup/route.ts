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

  const body = await req.json();
  const companyName = String(body.companyName || "").trim();
  const adminEmail = String(body.email || "").trim().toLowerCase();
  const subdomain = String(body.subdomain || "").trim().toLowerCase();
  const domain = String(body.domain || process.env.NEXT_PUBLIC_ROOT_DOMAIN || "hi5tech.co.uk")
    .trim()
    .toLowerCase();

  if (!companyName || !adminEmail || !subdomain) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  // 1) Create tenant (or whatever you already do)
  //    IMPORTANT: use your existing logic here (trial_ends_at etc).
  //    Example only:
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

  // 2) Ensure profile/membership rows exist as YOU currently do
  //    (depends on your schema). If you rely on a trigger, keep it.
  //    If not, you can “pre-provision” the admin user by email later.

  // 3) Send invite email (best effort)
  const redirectTo = `https://${tenant.subdomain}.${tenant.domain}/auth/callback`; // adjust if you use different route
  const { data: inviteData, error: inviteErr } = await supabase.auth.admin.inviteUserByEmail(
    adminEmail,
    { redirectTo }
  );

  // NOTE: inviteUserByEmail creates an auth user if it doesn't exist.
  // If you want to block invites unless the user is in your DB, you can do that check first.

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
