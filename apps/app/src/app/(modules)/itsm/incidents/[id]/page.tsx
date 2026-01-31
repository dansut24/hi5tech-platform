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

function Badge({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-full border px-2 py-0.5 text-xs hi5-border opacity-80 whitespace-nowrap">
      {children}
    </span>
  );
}

export default async function IncidentsList() {
  const supabase = await supabaseServer();
  const tenantIds = await getMemberTenantIds();

  /* ---------- NO TENANTS ---------- */
  if (!tenantIds.length) {
    return (
      <div className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold">Incidents</h1>
            <p className="text-sm opacity-70">No tenant memberships found.</p>
          </div>

          <Link
            href="/itsm/incidents/new"
            className="rounded-xl px-4 py-2 text-sm font-medium hi5-accent-btn self-start"
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
      {/* ---------- HEADER ---------- */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Incidents</h1>
          <p className="text-sm opacity-70">Your tenant-scoped incident list.</p>
        </div>

        <Link
          href="/itsm/incidents/new"
          className="rounded-xl px-4 py-2 text-sm font-medium hi5-accent-btn self-start"
        >
          New incident
        </Link>
      </div>

      {error ? (
        <div className="hi5-card p-4 text-sm text-red-600">
          {error.message}
        </div>
      ) : null}

      {/* ---------- LIST ---------- */}
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
                className="block p-4 transition hover:bg-black/5 dark:hover:bg-white/5"
              >
                {/* Mobile-first vertical layout */}
                <div className="space-y-2">
                  {/* Title */}
                  <div className="text-sm font-semibold truncate">
                    {r.number ?? "—"} • {r.title ?? "Untitled incident"}
                  </div>

                  {/* Meta */}
                  <div className="text-xs opacity-70">
                    Created: {fmt(r.created_at)}
                    {r.updated_at ? ` • Updated: ${fmt(r.updated_at)}` : null}
                  </div>

                  {/* Badges */}
                  <div className="flex flex-wrap gap-2 pt-1">
                    <Badge>
                      {String(r.status ?? "—").replace("_", " ")}
                    </Badge>
                    <Badge>{r.priority ?? "—"}</Badge>
                  </div>
                </div>
              </Link>
            );
          })}

          {!rows?.length && !error ? (
            <div className="p-4 text-sm opacity-70">
              No incidents found.
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
