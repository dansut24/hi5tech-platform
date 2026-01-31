import Link from "next/link";
import { createSupabaseServerClient } from "@hi5tech/auth";
import { createIncident } from "./actions";

function Badge({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-full border px-2 py-0.5 text-xs hi5-border opacity-80">
      {children}
    </span>
  );
}

function shortTenant(id: string) {
  if (!id) return "";
  return id.slice(0, 8);
}

export default async function IncidentsList() {
  const supabase = await createSupabaseServerClient();

  // Get all tenant memberships for this user
  const { data: userRes } = await supabase.auth.getUser();
  const user = userRes.user;

  if (!user) {
    return (
      <div className="space-y-3">
        <h1 className="text-2xl font-semibold">Incidents</h1>
        <div className="hi5-card p-4 text-sm opacity-80">
          Not logged in. Go to <Link className="underline" href="/login">/login</Link>.
        </div>
      </div>
    );
  }

  const { data: memberships, error: memErr } = await supabase
    .from("memberships")
    .select("tenant_id, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (memErr) {
    return (
      <div className="space-y-3">
        <h1 className="text-2xl font-semibold">Incidents</h1>
        <div className="hi5-card p-4 text-sm text-red-600">{memErr.message}</div>
      </div>
    );
  }

  const tenantIds = Array.from(new Set((memberships ?? []).map(m => m.tenant_id).filter(Boolean)));

  // Load incidents across all tenant memberships (until we add an active-tenant switcher)
  const { data: rows, error } = await supabase
    .from("incidents")
    .select("tenant_id,number,title,status,priority,created_at")
    .in("tenant_id", tenantIds.length ? tenantIds : ["00000000-0000-0000-0000-000000000000"])
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) {
    return (
      <div className="space-y-3">
        <h1 className="text-2xl font-semibold">Incidents</h1>
        <div className="hi5-card p-4">
          <div className="text-sm text-red-600">{error.message}</div>
          <div className="text-sm opacity-70 mt-2">
            If this mentions RLS, weâ€™ll add tenant-member policies next.
          </div>
        </div>
      </div>
    );
  }

  const incidents = rows ?? [];

  return (
    <div className="space-y-4">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Incidents</h1>
          <p className="opacity-80">
            {incidents.length} items â€¢ {tenantIds.length} tenant(s)
          </p>
        </div>
        <Link className="underline" href="/itsm">
          Dashboard
        </Link>
      </div>

      {/* Create form */}
      <form action={createIncident} className="hi5-card p-4 space-y-3">
        <div className="font-semibold">New incident</div>

        <div className="grid gap-3 sm:grid-cols-2">
          <label className="text-sm space-y-1">
            <div>Title</div>
            <input
              name="title"
              placeholder="e.g. User cannot access email"
              className="w-full hi5-input"
              required
            />
          </label>

          <label className="text-sm space-y-1">
            <div>Priority</div>
            <select
              name="priority"
              defaultValue="medium"
              className="w-full hi5-input"
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="critical">Critical</option>
            </select>
          </label>

          <label className="text-sm space-y-1 sm:col-span-2">
            <div>Description</div>
            <textarea
              name="description"
              placeholder="Add notesâ€¦"
              className="w-full hi5-input min-h-[96px]"
            />
          </label>
        </div>

        <button className="rounded-xl px-3 py-2 text-sm font-medium hi5-accent-btn">
          Create incident
        </button>
      </form>

      {/* Mobile cards */}
      <div className="grid gap-3 lg:hidden">
        {incidents.map((i) => (
          <Link key={`${i.tenant_id}:${i.number}`} href={`/itsm/incidents/${i.number}`} className="hi5-card p-4 block">
            <div className="flex items-center justify-between gap-2">
              <div className="font-semibold truncate">{i.number}</div>
              <Badge>{String(i.status).replace("_", " ")}</Badge>
            </div>
            <div className="mt-2 text-sm">{i.title}</div>
            <div className="mt-2 flex gap-2 flex-wrap text-xs opacity-80">
              <Badge>{String(i.priority)}</Badge>
              <Badge>t:{shortTenant(String(i.tenant_id))}</Badge>
              <span className="opacity-70">{new Date(i.created_at).toLocaleString()}</span>
            </div>
          </Link>
        ))}
        {!incidents.length ? (
          <div className="hi5-card p-4 text-sm opacity-80">No incidents found for your tenant memberships.</div>
        ) : null}
      </div>

      {/* Desktop table */}
      <div className="hidden lg:block hi5-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b hi5-border">
              <tr className="text-left opacity-80">
                <th className="p-3">Number</th>
                <th className="p-3">Title</th>
                <th className="p-3">Status</th>
                <th className="p-3">Priority</th>
                <th className="p-3">Tenant</th>
                <th className="p-3">Created</th>
              </tr>
            </thead>
            <tbody>
              {incidents.map((i) => (
                <tr key={`${i.tenant_id}:${i.number}`} className="border-b hi5-border last:border-b-0 hover:bg-black/5 dark:hover:bg-white/5">
                  <td className="p-3 font-medium">
                    <Link className="underline" href={`/itsm/incidents/${i.number}`}>
                      {i.number}
                    </Link>
                  </td>
                  <td className="p-3">{i.title}</td>
                  <td className="p-3">{String(i.status).replace("_", " ")}</td>
                  <td className="p-3">{i.priority}</td>
                  <td className="p-3">{shortTenant(String(i.tenant_id))}</td>
                  <td className="p-3">{new Date(i.created_at).toLocaleString()}</td>
                </tr>
              ))}
              {!incidents.length ? (
                <tr>
                  <td className="p-3 opacity-70" colSpan={6}>
                    No incidents found for your tenant memberships.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}