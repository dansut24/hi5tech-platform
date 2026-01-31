import Link from "next/link";
import { supabaseServer } from "@/lib/supabase/server";
import { getMemberTenantIds } from "@/lib/tenant";

function fmt(ts?: string | null) {
  if (!ts) return "—";
  try {
    return new Date(ts).toLocaleString();
  } catch {
    return ts ?? "—";
  }
}

export default async function IncidentsList() {
  const supabase = await supabaseServer();

  const tenantIds = await getMemberTenantIds();

  if (!tenantIds.length) {
    return (
      <div className="space-y-4">
        <div className="flex items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold">Incidents</h1>
            <p className="text-sm opacity-70">No tenant memberships found.</p>
          </div>
          <Link
            href="/itsm/incidents/new"
            className="rounded-xl px-3 py-2 text-sm font-medium hi5-accent-btn"
          >
            New incident
          </Link>
        </div>

        <div className="hi5-card p-4 text-sm opacity-80">
          You don’t belong to any tenants yet.
        </div>
      </div>
    );
  }

  const { data: rows, error } = await supabase
    .from("incidents")
    .select("id,tenant_id,number,title,status,priority,created_at,updated_at")
    .in("tenant_id", tenantIds)
    .order("created_at", { ascending: false })
    .limit(100);

  return (
    <div className="space-y-4">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Incidents</h1>
          <p className="text-sm opacity-70">Your tenant-scoped incident list.</p>
        </div>
        <Link
          href="/itsm/incidents/new"
          className="rounded-xl px-3 py-2 text-sm font-medium hi5-accent-btn"
        >
          New incident
        </Link>
      </div>

      {error ? (
        <div className="hi5-card p-4 text-sm text-red-600">{error.message}</div>
      ) : null}

      <div className="hi5-card overflow-hidden">
        <div className="divide-y hi5-divider">
          {(rows ?? []).map((r: any) => {
            const href = `/itsm/incidents/${encodeURIComponent(
              String(r.number ?? r.id)
            )}`;

            return (
              <Link
                key={r.id}
                href={href}
                className="block p-4 hover:bg-black/5 dark:hover:bg-white/5 transition"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-sm font-semibold truncate">
                      {r.number ?? "—"} • {r.title ?? "Untitled incident"}
                    </div>
                    <div className="text-xs opacity-70 mt-1">
                      Created: {fmt(r.created_at)}
                      {r.updated_at ? ` • Updated: ${fmt(r.updated_at)}` : null}
                    </div>
                  </div>

                  <div className="shrink-0 flex items-center gap-2">
                    <span className="inline-flex items-center rounded-full border px-2 py-0.5 text-xs hi5-border opacity-80">
                      {String(r.status ?? "—").replace("_", " ")}
                    </span>
                    <span className="inline-flex items-center rounded-full border px-2 py-0.5 text-xs hi5-border opacity-80">
                      {r.priority ?? "—"}
                    </span>
                  </div>
                </div>
              </Link>
            );
          })}

          {!rows?.length && !error ? (
            <div className="p-4 text-sm opacity-70">No incidents found.</div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
