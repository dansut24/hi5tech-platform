// apps/app/src/app/(modules)/admin/(protected)/users/invite/page.tsx
import { redirect, notFound } from "next/navigation";
import { headers } from "next/headers";

import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { getEffectiveHost, parseTenantHost } from "@/lib/tenant/tenant-from-host";

import InviteUserClient from "./invite-user-client";

export const dynamic = "force-dynamic";

function normalizeHost(rawHost: string) {
  return (rawHost || "").split(":")[0].trim().toLowerCase();
}

async function getTenantAndAdminUser() {
  const supabase = await supabaseServer();

  // Auth
  const { data: userRes } = await supabase.auth.getUser();
  const user = userRes.user;
  if (!user) redirect("/login");

  // Tenant from host
  const rawHost = getEffectiveHost(await headers());
  const requestHost = normalizeHost(rawHost);

  const parsed = parseTenantHost(rawHost);
  if (!parsed.subdomain) notFound();

  const { data: tenant } = await supabase
    .from("tenants")
    .select("id, domain, subdomain, name, company_name, is_active")
    .eq("domain", parsed.rootDomain)
    .eq("subdomain", parsed.subdomain)
    .maybeSingle();

  if (!tenant || tenant.is_active === false) notFound();

  // Must be owner/admin
  const { data: myMembership } = await supabase
    .from("memberships")
    .select("role")
    .eq("tenant_id", tenant.id)
    .eq("user_id", user.id)
    .maybeSingle();

  const myRole = String(myMembership?.role || "");
  const isAdmin = myRole === "owner" || myRole === "admin";
  if (!isAdmin) redirect("/apps");

  // Hard gate: onboarding
  const { data: settings } = await supabase
    .from("tenant_settings")
    .select("onboarding_completed")
    .eq("tenant_id", tenant.id)
    .maybeSingle();

  if (!Boolean(settings?.onboarding_completed)) redirect("/admin/setup");

  const tenantLabel = (tenant.company_name || tenant.name || tenant.subdomain) as string;

  return {
    tenantId: tenant.id as string,
    tenantLabel,
    // IMPORTANT: use the real request host for invites (most reliable)
    requestHost, // e.g. "dansworld.hi5tech.co.uk"
  };
}

export default async function InviteUserPage() {
  const { tenantId, tenantLabel, requestHost } = await getTenantAndAdminUser();

  async function inviteAction(formData: FormData) {
    "use server";

    const emailRaw = String(formData.get("email") || "").trim();
    const fullNameRaw = String(formData.get("full_name") || "").trim();
    const roleRaw = String(formData.get("role") || "user").trim(); // memberships.role
    const module = String(formData.get("module") || "selfservice").trim();

    const email = emailRaw.toLowerCase();
    const full_name = fullNameRaw;

    if (!email || !email.includes("@")) {
      return { ok: false, error: "Please enter a valid email address." };
    }
    if (module !== "selfservice") {
      return { ok: false, error: "This invite flow currently supports Self Service only." };
    }

    // Service role for provisioning writes (bypasses RLS safely)
    const admin = supabaseAdmin();

    // Tenant-aware invite link MUST use the host the admin is on right now
    // to avoid ".hi5tech.co.uk" issues.
    const companyParam = encodeURIComponent(tenantLabel || "Hi5Tech");
    const tenantParam = encodeURIComponent(requestHost);

    // Supabase appends token_hash/type automatically.
    // We include next/company/tenant for your /auth/invite and email template.
    const redirectTo = `https://${requestHost}/auth/invite?next=/auth/set-password&company=${companyParam}&tenant=${tenantParam}`;

    let invitedUserId: string | null = null;

    // 1) Invite via Auth Admin
    const inviteRes = await admin.auth.admin.inviteUserByEmail(email, {
      data: {
        full_name: full_name || undefined,
        tenant_id: tenantId,
        tenant_host: requestHost,
        company: tenantLabel || "Hi5Tech",
      },
      redirectTo,
    });

    if (inviteRes.error) {
      // If user already exists, try to find their id via profiles.email
      const msg = inviteRes.error.message || "";
      const already =
        msg.toLowerCase().includes("already") ||
        msg.toLowerCase().includes("registered") ||
        msg.toLowerCase().includes("exists");

      if (!already) {
        return { ok: false, error: `Invite failed: ${inviteRes.error.message}` };
      }

      const { data: existingProfile, error: profErr } = await admin
        .from("profiles")
        .select("id")
        .eq("email", email)
        .maybeSingle();

      if (profErr) return { ok: false, error: `Lookup failed: ${profErr.message}` };
      if (!existingProfile?.id) {
        return {
          ok: false,
          error:
            "User already exists in Auth, but no matching profile was found to link them. Ensure profiles.email is populated for existing users.",
        };
      }

      invitedUserId = existingProfile.id;
    } else {
      invitedUserId = inviteRes.data.user?.id ?? null;
    }

    if (!invitedUserId) {
      return { ok: false, error: "Could not determine invited user id." };
    }

    // 2) Upsert profile
    const { error: upErr } = await admin.from("profiles").upsert(
      {
        id: invitedUserId,
        full_name: full_name || null,
        email,
      },
      { onConflict: "id" }
    );
    if (upErr) return { ok: false, error: `Profile upsert failed: ${upErr.message}` };

    // 3) Create membership (or reuse existing)
    const { data: existingMembership, error: emErr } = await admin
      .from("memberships")
      .select("id, role")
      .eq("tenant_id", tenantId)
      .eq("user_id", invitedUserId)
      .maybeSingle();

    if (emErr) return { ok: false, error: `Membership lookup failed: ${emErr.message}` };

    let membershipId = existingMembership?.id ?? null;

    if (!membershipId) {
      const { data: newMembership, error: memErr } = await admin
        .from("memberships")
        .insert({
          tenant_id: tenantId,
          user_id: invitedUserId,
          role: roleRaw || "user",
        })
        .select("id")
        .single();

      if (memErr) return { ok: false, error: `Membership create failed: ${memErr.message}` };
      membershipId = newMembership.id;
    }

    // 4) Assign Self Service module only (idempotent)
    const { error: modErr } = await admin
      .from("module_assignments")
      .upsert({ membership_id: membershipId, module: "selfservice" }, { onConflict: "membership_id,module" });

    if (modErr) return { ok: false, error: `Module assignment failed: ${modErr.message}` };

    return { ok: true, invited_user_id: invitedUserId };
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="hi5-panel border hi5-border rounded-3xl p-5 sm:p-6">
        <div className="mb-4">
          <h1 className="text-lg font-semibold">Invite a Self Service user</h1>
          <p className="text-sm opacity-70 mt-1">
            Invite a user to <span className="font-medium">{tenantLabel}</span> with Self Service access only.
          </p>
          <p className="text-xs opacity-60 mt-2">
            Invite link will open on: <span className="font-medium">{requestHost}</span>
          </p>
        </div>

        <InviteUserClient tenantLabel={tenantLabel} action={inviteAction} />
      </div>
    </div>
  );
}
