// apps/marketing/src/app/api/signup/route.ts
import { NextResponse } from "next/server";
import { createClient, type AuthError } from "@supabase/supabase-js";

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

  if (!s) return "";
  if (s.length < 2) return "";
  if (s.length > 63) return s.slice(0, 63);
  return s;
}

function isEmailExistsError(err: unknown) {
  const anyErr = err as any;
  const msg = String(anyErr?.message ?? "").toLowerCase();
  const code = String(anyErr?.code ?? "").toLowerCase();
  const errorCode = String(anyErr?.error_code ?? "").toLowerCase();

  // Supabase sometimes signals this as "email_exists" (as you saw in logs)
  return (
    msg.includes("already") ||
    msg.includes("exists") ||
    code === "email_exists" ||
    errorCode === "email_exists"
  );
}

async function findAuthUserIdByEmail(supabase: ReturnType<typeof getAdminClient>, email: string) {
  // NOTE: Supabase Admin API does not expose a direct "get by email" endpoint in all clients.
  // listUsers is fine for early stage. If you grow beyond 200 users, we can page or store mapping in DB.
  const { data, error } = await supabase.auth.admin.listUsers({ page: 1, perPage: 200 });
  if (error) return { userId: null as string | null, error: error.message };
  const u = data?.users?.find((x) => (x.email || "").toLowerCase() === email.toLowerCase());
  return { userId: u?.id ?? null, error: null as string | null };
}

export async function POST(req: Request) {
  const supabase = getAdminClient();

  const body = await req.json().catch(() => ({} as any));

  // Accept multiple possible names from the client form
  const companyName = String(
    body.companyName ?? body.company_name ?? body.company ?? body.name ?? ""
  ).trim();

  const adminEmail = String(body.email ?? body.adminEmail ?? body.admin_email ?? "")
    .trim()
    .toLowerCase();

  const subdomain = normalizeSubdomain(body.subdomain ?? body.tenant ?? body.tenantSubdomain ?? "");

  const domain = String(body.domain ?? process.env.NEXT_PUBLIC_ROOT_DOMAIN ?? "hi5tech.co.uk")
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
      { error: tenantErr?.message ?? "Failed to create tenant" },
      { status: 400 }
    );
  }

  // 2) Send invite (or magic link if user already exists)
  // IMPORTANT:
  // - redirectTo must be allow-listed in Supabase Redirect URLs
  // - We redirect into /auth/invite (landing page), NOT directly to Supabase confirmation URL
  //   because email scanners can consume OTP links.
  const redirectTo =
    `https://${tenant.subdomain}.${tenant.domain}/auth/callback` + `?next=/auth/invite`;

  let userId: string | null = null;
  let sent = false;
  let inviteKind: "invite" | "magiclink" | "none" = "none";
  let inviteError: string | null = null;

  const { data: inviteData, error: inviteErr } = await supabase.auth.admin.inviteUserByEmail(
    adminEmail,
    {
      redirectTo,
      data: {
        tenant: tenant.subdomain,
        domain: tenant.domain,
        company: companyName,
      },
    }
  );

  if (!inviteErr && inviteData?.user?.id) {
    userId = inviteData.user.id;
    sent = true;
    inviteKind = "invite";
  } else {
    // Common case: user already exists => invite fails with "email_exists"
    if (isEmailExistsError(inviteErr)) {
      const found = await findAuthUserIdByEmail(supabase, adminEmail);
      userId = found.userId;

      if (!userId) {
        inviteError = found.error ?? inviteErr?.message ?? "User exists but could not be resolved";
      } else {
        // Send a magic link to the tenant domain.
        // The user will land on /auth/invite which can guide them into set-password.
        const { error: linkErr } = await supabase.auth.admin.generateLink({
          type: "magiclink",
          email: adminEmail,
          options: { redirectTo },
        });

        if (linkErr) {
          inviteError = linkErr.message;
        } else {
          sent = true;
          inviteKind = "magiclink";
          inviteError = null;
        }
      }
    } else {
      inviteError = inviteErr?.message ?? "Invite failed";
    }
  }

  // 3) Provision DB rows so login is authorised immediately (even if user existed already)
  if (userId) {
    // (Optional but recommended) set created_by on the tenant
    await supabase.from("tenants").update({ created_by: userId }).eq("id", tenant.id);

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

    // ✅ FIRST USER = OWNER / SUPER ADMIN
    // Pick ONE role string and use it consistently everywhere.
    // Recommended: "owner"
    await supabase.from("memberships").upsert(
      {
        tenant_id: tenant.id,
        user_id: userId,
        role: "owner",
        created_at: new Date().toISOString(),
      },
      { onConflict: "tenant_id,user_id" }
    );

    // Optional: give them all modules right away (if your app expects module_assignments)
    const { data: membershipRow } = await supabase
      .from("memberships")
      .select("id")
      .eq("tenant_id", tenant.id)
      .eq("user_id", userId)
      .maybeSingle();

    if (membershipRow?.id) {
      await supabase.from("module_assignments").upsert(
        [
          { membership_id: membershipRow.id, module: "itsm" },
          { membership_id: membershipRow.id, module: "control" },
          { membership_id: membershipRow.id, module: "selfservice" },
          { membership_id: membershipRow.id, module: "admin" },
        ],
        { onConflict: "membership_id,module" }
      );
    }
  }

  // Best effort — even if email fails, tenant is created and provisioning is attempted.
  return NextResponse.json({
    ok: true,
    tenant,
    invite: {
      sent,
      kind: inviteKind,
      error: inviteError,
      userId,
      redirectTo,
    },
  });
}
