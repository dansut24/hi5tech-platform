// apps/app/src/app/admin/page.tsx
import Link from "next/link";
import { supabaseServer } from "@/lib/supabase/server";
import { headers } from "next/headers";
import { getEffectiveHost, parseTenantHost } from "@/lib/tenant/tenant-from-host";
import { notFound } from "next/navigation";

function formatDate(d: Date) {
  return d.toLocaleString(undefined, {
    weekday: "short",
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default async function AdminDashboardPage() {
  const supabase = await supabaseServer();

  const host = getEffectiveHost(await headers());
  const parsed = parseTenantHost(host);
  if (!parsed.subdomain) notFound();

  const { data: tenant } = await supabase
    .from("tenants")
    .select("id, domain, subdomain, name")
    .eq("domain", parsed.rootDomain)
    .eq("subdomain", parsed.subdomain)
    .maybeSingle();

  if (!tenant) notFound();

  // Simple metrics (real)
  const { count: usersCount } = await supabase
    .from("memberships")
    .select("id", { count: "exact", head: true })
    .eq("tenant_id", tenant.id);

  // Placeholder “billing” style metrics (template data for now)
  const kpis = [
    { label: "Users", value: String(usersCount ?? 0), hint: "Members in this tenant" },
    { label: "Active modules", value: "4", hint: "ITSM, Control, Self Service, Admin" },
    { label: "Plan", value: "Trial", hint: "14 days remaining" },
    { label: "Security", value: "Good", hint: "2FA + SSO coming" },
  ];

  const activity = [
    { title: "Invite sent to new user", meta: "Users", at: new Date(Date.now() - 1000 * 60 * 14) },
    { title: "Tenant branding updated", meta: "Tenant", at: new Date(Date.now() - 1000 * 60 * 60 * 3) },
    { title: "Module enabled: Control", meta: "Modules", at: new Date(Date.now() - 1000 * 60 * 60 * 26) },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Admin dashboard</h1>
          <p className="text-sm opacity-80 mt-1">
            Manage settings and users for{" "}
            <span className="font-medium">{tenant.subdomain}</span>.
          </p>
        </div>

        <div className="flex gap-2">
          <Link href="/admin/users/invite" className="hi5-btn-primary">
            Invite user
          </Link>
          <Link href="/admin/tenant" className="hi5-btn-ghost">
            Tenant settings
          </Link>
        </div>
      </div>

      {/* KPI grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {kpis.map((k) => (
          <div key={k.label} className="hi5-panel p-5">
            <div className="text-xs uppercase tracking-wide opacity-70">{k.label}</div>
            <div className="mt-2 text-2xl font-extrabold">{k.value}</div>
            <div className="mt-1 text-xs opacity-70">{k.hint}</div>
          </div>
        ))}
      </div>

      {/* Two-column area */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Activity */}
        <div className="lg:col-span-2 hi5-panel p-0 overflow-hidden">
          <div className="px-5 py-4 border-b hi5-divider flex items-center justify-between">
            <div>
              <div className="text-sm font-semibold">Recent activity</div>
              <div className="text-xs opacity-70">A quick preview of changes in this tenant</div>
            </div>
            <Link href="/admin/audit" className="text-sm hi5-accent">
              View audit log
            </Link>
          </div>

          <div className="divide-y hi5-divider">
            {activity.map((a, idx) => (
              <div key={idx} className="px-5 py-4 flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="text-sm font-medium">{a.title}</div>
                  <div className="text-xs opacity-70 mt-1">{a.meta}</div>
                </div>
                <div className="text-xs opacity-70 whitespace-nowrap">{formatDate(a.at)}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Quick actions */}
        <div className="hi5-panel p-5">
          <div className="text-sm font-semibold">Quick actions</div>
          <p className="text-xs opacity-70 mt-1">
            Common admin tasks for this tenant.
          </p>

          <div className="mt-4 space-y-2">
            <Link href="/admin/users" className="hi5-btn-ghost w-full inline-flex justify-center">
              Manage users
            </Link>
            <Link href="/admin/tenant" className="hi5-btn-ghost w-full inline-flex justify-center">
              Branding & modules
            </Link>
            <Link href="/admin/billing" className="hi5-btn-ghost w-full inline-flex justify-center">
              Billing & usage
            </Link>
          </div>

          <div className="mt-5 p-4 rounded-2xl border hi5-border">
            <div className="text-xs uppercase tracking-wide opacity-70">Tip</div>
            <div className="text-sm mt-1">
              Add your team now so they can access ITSM/Control straight away.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
