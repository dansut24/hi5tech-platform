import { redirect, notFound } from "next/navigation";
import { headers } from "next/headers";

import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { getEffectiveHost, parseTenantHost } from "@/lib/tenant/tenant-from-host";

import InviteUserClient from "./invite-user-client";

export const dynamic = "force-dynamic";

async function getTenantAndAdminUser() {
  const supabase = await supabaseServer();

  // Auth
  const { data: userRes } = await supabase.auth.getUser();
  const user = userRes.user;
  if (!user) redirect("/login");

  // Tenant from host
  const host = getEffectiveHost(await headers());
  const parsed = parseTenantHost(host);
  if (!parsed.subdomain) notFound();

  const { data: tenant } = await supabase
    .from("tenants")
    .select("id, domain, subdomain, name, is_active")
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

  // Must be onboarded (same rule as your protected layout)
  const { data: settings } = await supabase
    .from("tenant_settings")
    .select("onboarding_completed")
    .eq("tenant_id", tenant.id)
    .maybeSingle();

  if (!Boolean(settings?.onboarding_completed)) redirect("/admin/setup");

  return { tenantId: tenant.id, tenantLabel: tenant.name ?? tenant.subdomain };
}

export default async function InviteUserPage() {
  const { tenantId, tenantLabel } = await getTenantAndAdminUser();

  async function inviteAction(formData: FormData) {
    "use server";

    const emailRaw = String(formData.get("email") || "").trim();
    const fullNameRaw = String(formData.get("full_name") || "").trim();
    const roleRaw = String(formData.get("role") || "user").trim(); // membership.role
    const module = String(formData.get("module") || "selfservice").trim();

    const email = emailRaw.toLowerCase();
    const full_name = fullNameRaw;

    if (!email || !email.includes("@")) {
      return { ok: false, error: "Please enter a valid email address." };
    }

    if (module !== "selfservice") {
      return { ok: false, error: "This invite flow currently supports Self Service only." };
    }

    const admin = supabaseAdmin();
    const supabase = await supabaseServer();

    let invitedUserId: string | null = null;

    // 1) Invite via Supabase Auth Admin
    const inviteRes = await admin.auth.admin.inviteUserByEmail(email, {
      data: {
        full_name: full_name || undefined,
        tenant_id: tenantId,
      },
    });

    if (inviteRes.error) {
      // Fallback: if user already exists, try to find their id via profiles.email
      const msg = inviteRes.error.message || "";
      const already =
        msg.toLowerCase().includes("already") ||
        msg.toLowerCase().includes("registered") ||
        msg.toLowerCase().includes("exists");

      if (!already) {
        return { ok: false, error: `Invite failed: ${inviteRes.error.message}` };
      }

      const { data: existingProfile } = await supabase
        .from("profiles")
        .select("id")
        .eq("email", email)
        .maybeSingle();

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

    // 2) Upsert profile (optional but nice)
    // Assumes profiles.id == auth.users.id
    await supabase
      .from("profiles")
      .upsert(
        {
          id: invitedUserId,
          full_name: full_name || null,
          email,
        },
        { onConflict: "id" }
      );

    // 3) Create membership (role=user by default)
    // If membership already exists, keep existing role.
    const { data: existingMembership } = await supabase
      .from("memberships")
      .select("id, role")
      .eq("tenant_id", tenantId)
      .eq("user_id", invitedUserId)
      .maybeSingle();

    let membershipId = existingMembership?.id ?? null;

    if (!membershipId) {
      const { data: newMembership, error: memErr } = await supabase
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
    const { error: modErr } = await supabase
      .from("module_assignments")
      .upsert(
        { membership_id: membershipId, module: "selfservice" },
        // if you have a unique constraint, this works; if not, it still upserts by PK only.
        // Ideally: unique(membership_id, module)
        { onConflict: "membership_id,module" }
      );

    if (modErr) {
      // If you don't have that composite unique, fall back to "insert ignore"
      const { error: modErr2 } = await supabase
        .from("module_assignments")
        .insert({ membership_id: membershipId, module: "selfservice" });

      if (modErr2 && !String(modErr2.message || "").toLowerCase().includes("duplicate")) {
        return { ok: false, error: `Module assignment failed: ${modErr2.message}` };
      }
    }

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
        </div>

        <InviteUserClient tenantLabel={tenantLabel} action={inviteAction} />
      </div>
    </div>
  );
}
