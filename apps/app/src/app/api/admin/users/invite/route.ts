// apps/app/src/app/api/admin/users/invite/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { supabaseServer } from "@/lib/supabase/server";
import { getEffectiveHost, parseTenantHost } from "@/lib/tenant/tenant-from-host";

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
  const supabase = await supabaseServer();

  const { data: userRes } = await supabase.auth.getUser();
  const me = userRes.user;
  if (!me) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({} as any));
  const email = String(body.email || "").trim().toLowerCase();
  const role = String(body.role || "user").trim();

  if (!email) return NextResponse.json({ ok: false, error: "Missing email" }, { status: 400 });

  const allowedRoles = new Set(["owner", "admin", "user", "viewer", "agent"]);
  if (!allowedRoles.has(role)) return NextResponse.json({ ok: false, error: "Invalid role" }, { status: 400 });

  const host = getEffectiveHost(req.headers);
  const parsed = parseTenantHost(host);
  if (!parsed.subdomain) return NextResponse.json({ ok: false, error: "Tenant subdomain required" }, { status: 400 });

  const { data: tenant } = await supabase
    .from("tenants")
    .select("id, domain, subdomain")
    .eq("domain", parsed.rootDomain)
    .eq("subdomain", parsed.subdomain)
    .maybeSingle();

  if (!tenant) return NextResponse.json({ ok: false, error: "Tenant not found" }, { status: 404 });

  // Must be tenant admin
  const { data: myMembership } = await supabase
    .from("memberships")
    .select("role")
    .eq("tenant_id", tenant.id)
    .eq("user_id", me.id)
    .maybeSingle();

  const myRole = String(myMembership?.role || "");
  const isAdmin = myRole === "owner" || myRole === "admin";
  if (!isAdmin) return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });

  // If already a member, don't invite again
  const { data: existingProfile } = await supabase
    .from("profiles")
    .select("id, email")
    .eq("email", email)
    .maybeSingle();

  if (existingProfile?.id) {
    const { data: existingMembership } = await supabase
      .from("memberships")
      .select("id")
      .eq("tenant_id", tenant.id)
      .eq("user_id", existingProfile.id)
      .maybeSingle();

    if (existingMembership?.id) {
      return NextResponse.json({
        ok: true,
        invited: false,
        userId: existingProfile.id,
        tenant: { id: tenant.id, domain: tenant.domain, subdomain: tenant.subdomain },
        message: "User already exists and is already a member of this tenant.",
      });
    }
  }

  // Admin invite + provisioning requires service role
  let admin;
  try {
    admin = getAdminClient();
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message || "Missing service role configuration" },
      { status: 501 }
    );
  }

  // Send invite email (goes to tenant set-password flow)
  const redirectTo =
    `https://${tenant.subdomain}.${tenant.domain}/auth/callback` +
    `?next=/auth/set-password` +
    `&tenant=${encodeURIComponent(tenant.subdomain)}`;

  const { data: inviteData, error: inviteErr } = await admin.auth.admin.inviteUserByEmail(email, {
    redirectTo,
  });

  const invitedUserId = inviteData?.user?.id ?? null;

  // Even if email sending fails, we still create membership if we have an auth user id.
  // If invite failed AND no user id, we can't create profile/membership.
  if (!invitedUserId) {
    return NextResponse.json({
      ok: true,
      invited: false,
      userId: null,
      tenant: { id: tenant.id, domain: tenant.domain, subdomain: tenant.subdomain },
      message: inviteErr?.message
        ? `Invite could not be sent: ${inviteErr.message}`
        : "Invite did not return a user id.",
    });
  }

  // Ensure profile exists (profiles.id must match auth.users.id for your schema)
  // Prefer admin client to bypass RLS
  const { error: profErr } = await admin
    .from("profiles")
    .upsert(
      { id: invitedUserId, email, role: role, tenant_id: tenant.id },
      { onConflict: "id" }
    );

  if (profErr) {
    // Don't hard fail; membership insert might still work if profile exists already
    // but in your DB memberships_user_id_fkey references profiles.id, so this matters.
  }

  // Create membership
  const { data: membership, error: memErr } = await admin
    .from("memberships")
    .insert({ tenant_id: tenant.id, user_id: invitedUserId, role })
    .select("id")
    .maybeSingle();

  if (memErr) {
    return NextResponse.json({
      ok: true,
      invited: !inviteErr,
      userId: invitedUserId,
      tenant: { id: tenant.id, domain: tenant.domain, subdomain: tenant.subdomain },
      message: `Invite created, but membership could not be created: ${memErr.message}`,
    });
  }

  // Optional: default modules for new users (adjust to your world)
  // Here we give ITSM by default; you can change this later.
  await admin.from("module_assignments").insert([
    { membership_id: membership?.id, module: "itsm" },
  ]);

  return NextResponse.json({
    ok: true,
    invited: !inviteErr,
    userId: invitedUserId,
    tenant: { id: tenant.id, domain: tenant.domain, subdomain: tenant.subdomain },
    message: inviteErr
      ? `User created, but invite email could not be sent: ${inviteErr.message}`
      : "Invite sent and membership created.",
  });
}
