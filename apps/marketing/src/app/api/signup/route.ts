import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

type Body = {
  companyName?: string;
  subdomain?: string;
  adminEmail?: string;
};

function normalizeSubdomain(input: string) {
  const s = input
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/[^a-z0-9-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
  return s;
}

function isEmail(s: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s.trim());
}

function daysFromNow(days: number) {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString();
}

export async function POST(req: Request) {
  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }

  const companyName = String(body.companyName || "").trim();
  const adminEmail = String(body.adminEmail || "").trim();
  const subdomainRaw = String(body.subdomain || "");
  const subdomain = normalizeSubdomain(subdomainRaw);

  if (!companyName || companyName.length < 2) {
    return NextResponse.json({ ok: false, error: "Company name is required" }, { status: 400 });
  }
  if (!adminEmail || !isEmail(adminEmail)) {
    return NextResponse.json({ ok: false, error: "A valid admin email is required" }, { status: 400 });
  }
  if (!subdomain || subdomain.length < 3) {
    return NextResponse.json(
      { ok: false, error: "Subdomain must be at least 3 characters" },
      { status: 400 }
    );
  }

  const supabase = supabaseAdmin();

  const rootDomain =
    process.env.TENANT_ROOT_DOMAIN ||
    process.env.NEXT_PUBLIC_TENANT_ROOT_DOMAIN ||
    "hi5tech.co.uk";

  // 1) Check subdomain availability
  const { data: existing, error: existingErr } = await supabase
    .from("tenants")
    .select("id")
    .eq("subdomain", subdomain)
    .maybeSingle();

  if (existingErr) {
    return NextResponse.json(
      { ok: false, error: `Failed to check subdomain: ${existingErr.message}` },
      { status: 500 }
    );
  }
  if (existing) {
    return NextResponse.json(
      { ok: false, error: "That subdomain is already taken" },
      { status: 409 }
    );
  }

  // 2) Create tenant
  const { data: tenant, error: tenantErr } = await supabase
    .from("tenants")
    .insert({
      name: companyName,
      company_name: companyName,
      subdomain,
      domain: rootDomain,
      is_active: true,
    })
    .select("id, subdomain, domain")
    .single();

  if (tenantErr || !tenant) {
    return NextResponse.json(
      { ok: false, error: `Failed to create tenant: ${tenantErr?.message || "unknown"}` },
      { status: 500 }
    );
  }

  // 3) Ensure tenant_settings row exists (optional table)
  // If the table doesn't exist yet, we ignore the error so signup still works.
  try {
    await supabase
      .from("tenant_settings")
      .insert({
        tenant_id: tenant.id,
        // sane brand defaults (matches your globals.css defaults)
        accent_hex: "#00c1ff",
        accent_2_hex: "#ff4fe1",
        accent_3_hex: "#ffc42d",
        bg_hex: "#f8fafc",
        card_hex: "#ffffff",
        topbar_hex: "#ffffff",
        glow_1: 0.18,
        glow_2: 0.14,
        glow_3: 0.10,
      })
      .select("tenant_id")
      .single();
  } catch {
    // ignore
  }

  // 4) Create / invite the admin user
  // We prefer invite email (better UX). If invite fails (email provider not configured),
  // we still create the user, and return success with a note.
  let userId: string | null = null;
  let inviteSent = false;
  let inviteError: string | null = null;

  try {
    const { data, error } = await supabase.auth.admin.inviteUserByEmail(adminEmail, {
      redirectTo:
        process.env.APP_LOGIN_REDIRECT || process.env.NEXT_PUBLIC_APP_LOGIN_REDIRECT || undefined,
    });
    if (error) throw error;
    userId = data.user?.id ?? null;
    inviteSent = true;
  } catch (e: any) {
    inviteError = e?.message || String(e);

    // fallback: create user without sending email
    const randomPassword = crypto.randomUUID();
    const { data, error } = await supabase.auth.admin.createUser({
      email: adminEmail,
      password: randomPassword,
      email_confirm: true,
    });
    if (error) {
      return NextResponse.json(
        {
          ok: false,
          error: `Tenant created but failed to create admin user: ${error.message}`,
        },
        { status: 500 }
      );
    }
    userId = data.user?.id ?? null;
  }

  // 5) Create membership (and default module access)
  if (userId) {
    // memberships: expected columns in your app are: user_id, tenant_id
    const { data: membership, error: memErr } = await supabase
      .from("memberships")
      .insert({ user_id: userId, tenant_id: tenant.id })
      .select("id")
      .single();

    if (!memErr && membership?.id) {
      // Give access to core modules by default (adjust if you want less)
      const rows = ["itsm", "control", "selfservice"].map((m) => ({
        membership_id: membership.id,
        module: m,
      }));

      // Ignore errors here (table may be empty / schema may differ)
      try {
        await supabase.from("module_assignments").insert(rows);
      } catch {
        // ignore
      }
    }
  }

  // 6) Optional: record a 14-day trial (separate table so it won't break your app)
  // If the table doesn't exist yet, we ignore.
  try {
    await supabase.from("tenant_subscriptions").insert({
      tenant_id: tenant.id,
      status: "trialing",
      plan: "trial",
      trial_ends_at: daysFromNow(14),
    });
  } catch {
    // ignore
  }

  const tenantHost = `${tenant.subdomain}.${tenant.domain}`;

  return NextResponse.json({
    ok: true,
    tenant: { id: tenant.id, host: tenantHost },
    inviteSent,
    inviteError,
  });
}
