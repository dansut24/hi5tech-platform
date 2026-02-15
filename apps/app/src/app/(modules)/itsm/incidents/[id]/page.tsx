import { supabaseServer } from "@/lib/supabase/server";
import { getMemberTenantIds } from "@/lib/tenant";
import { addIncidentComment } from "./actions";
import { uploadIncidentAttachment, deleteIncidentAttachment } from "./attachments.actions";

export const dynamic = "force-dynamic";

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

export default async function IncidentDetailPage({
  params,
  searchParams,
}: {
  params: any;
  searchParams?: { tab?: string };
}) {
  const p = await params;
  const raw = String(p?.id ?? "").trim();
  const tab = searchParams?.tab ?? "overview";

  const supabase = await supabaseServer();
  const tenantIds = await getMemberTenantIds();
  if (!tenantIds.length) {
    return <div className="hi5-card p-4 text-sm opacity-80">No tenant memberships found.</div>;
  }

  const isUuid =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(raw);

  const baseSelect = [
    "id",
    "tenant_id",
    "number",
    "title",
    "description",
    "category",
    "status",
    "priority",
    "triage_status",
    "assignee_id",
    "assigned_team_id",
    "requester_id",
    "asset_tag",
    "created_at",
    "updated_at",
    "sla_due",
    "is_breached",
    "resolution_notes",
  ].join(",");

  let incident: any = null;

  if (isUuid) {
    const { data } = await supabase
      .from("incidents")
      .select(baseSelect)
      .eq("id", raw)
      .in("tenant_id", tenantIds)
      .maybeSingle();
    incident = data ?? null;
  }

  if (!incident) {
    const { data } = await supabase
      .from("incidents")
      .select(baseSelect)
      .in("tenant_id", tenantIds)
      .eq("number", raw)
      .maybeSingle();
    incident = data ?? null;
  }

  if (!incident) {
    return <div className="hi5-card p-4 text-sm opacity-80">Incident not found.</div>;
  }

  // Updates (comments)
  const { data: comments } = await supabase
    .from("incident_comments")
    .select("id, message, author_id, created_at")
    .eq("tenant_id", incident.tenant_id)
    .eq("incident_id", incident.id)
    .order("created_at", { ascending: false });

  // Files
  const { data: files } = await supabase
    .from("itsm_attachments")
    .select("id, file_name, mime_type, byte_size, storage_path, created_at")
    .eq("tenant_id", incident.tenant_id)
    .eq("entity_type", "incident")
    .eq("entity_id", incident.id)
    .order("created_at", { ascending: false });

  if (tab === "updates") {
    return (
      <div className="space-y-3">
        <div className="hi5-panel p-5">
          <div className="text-sm font-semibold">Updates</div>
          <div className="text-xs opacity-70 mt-1">
            Add progress notes for the requester and internal team.
          </div>

          <form action={addIncidentComment} className="mt-4 space-y-2">
            <input type="hidden" name="incident_id" value={incident.id} />
            <textarea
              name="message"
              className="w-full min-h-[120px] rounded-2xl border hi5-border hi5-card px-4 py-3 text-sm outline-none"
              placeholder="Write an update…"
              required
            />
            <div className="flex items-center justify-end">
              <button type="submit" className="hi5-btn-primary text-sm w-auto">
                Add update
              </button>
            </div>
          </form>
        </div>

        <div className="hi5-card overflow-hidden">
          <div className="divide-y hi5-divider">
            {(comments ?? []).map((c: any) => (
              <div key={c.id} className="p-4 space-y-1">
                <div className="text-xs opacity-70">
                  {fmt(c.created_at)} • <span className="font-mono">{c.author_id}</span>
                </div>
                <div className="text-sm whitespace-pre-wrap">{c.message}</div>
              </div>
            ))}
            {!comments?.length ? (
              <div className="p-4 text-sm opacity-70">No updates yet.</div>
            ) : null}
          </div>
        </div>
      </div>
    );
  }

  if (tab === "files") {
    return (
      <div className="space-y-3">
        <div className="hi5-panel p-5">
          <div className="text-sm font-semibold">Files</div>
          <div className="text-xs opacity-70 mt-1">Attach files to help triage and resolve faster.</div>

          <form action={uploadIncidentAttachment} className="mt-4 space-y-2">
            <input type="hidden" name="incident_id" value={incident.id} />
            <input type="hidden" name="tenant_id" value={incident.tenant_id} />
            <input
              type="file"
              name="file"
              className="block w-full text-sm"
              required
            />
            <div className="flex items-center justify-end">
              <button type="submit" className="hi5-btn-primary text-sm w-auto">
                Upload
              </button>
            </div>
          </form>
        </div>

        <div className="hi5-card overflow-hidden">
          <div className="divide-y hi5-divider">
            {(files ?? []).map((f: any) => (
              <div key={f.id} className="p-4 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-sm font-semibold truncate">{f.file_name}</div>
                  <div className="text-xs opacity-70">
                    {fmt(f.created_at)}
                    {f.mime_type ? ` • ${f.mime_type}` : ""}
                    {typeof f.byte_size === "number" ? ` • ${Math.round(f.byte_size / 1024)} KB` : ""}
                  </div>
                </div>

                <form action={deleteIncidentAttachment}>
                  <input type="hidden" name="tenant_id" value={incident.tenant_id} />
                  <input type="hidden" name="attachment_id" value={f.id} />
                  <button type="submit" className="hi5-btn-ghost text-sm w-auto">
                    Delete
                  </button>
                </form>
              </div>
            ))}
            {!files?.length ? (
              <div className="p-4 text-sm opacity-70">No files uploaded.</div>
            ) : null}
          </div>
        </div>
      </div>
    );
  }

  // Overview
  return (
    <div className="space-y-3">
      <div className="hi5-panel p-5 space-y-3">
        <div className="flex flex-wrap gap-2">
          <Badge>{incident.status}</Badge>
          <Badge>{incident.priority}</Badge>
          {incident.triage_status ? <Badge>{incident.triage_status}</Badge> : null}
          {incident.is_breached ? <Badge>⚠ SLA breached</Badge> : null}
          {incident.sla_due ? <Badge>SLA due: {fmt(incident.sla_due)}</Badge> : null}
        </div>

        <div>
          <div className="text-xs opacity-70">Category</div>
          <div className="text-sm font-semibold">{incident.category ?? "—"}</div>
        </div>

        <div>
          <div className="text-xs opacity-70">Description</div>
          <div className="text-sm whitespace-pre-wrap opacity-90">
            {incident.description ?? "—"}
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <div className="text-xs opacity-70">Created</div>
            <div className="text-sm">{fmt(incident.created_at)}</div>
          </div>
          <div>
            <div className="text-xs opacity-70">Updated</div>
            <div className="text-sm">{fmt(incident.updated_at)}</div>
          </div>
        </div>
      </div>

      <div className="hi5-panel p-5">
        <div className="text-sm font-semibold">Quick update</div>
        <form action={addIncidentComment} className="mt-3 space-y-2">
          <input type="hidden" name="incident_id" value={incident.id} />
          <textarea
            name="message"
            className="w-full min-h-[90px] rounded-2xl border hi5-border hi5-card px-4 py-3 text-sm outline-none"
            placeholder="Add a quick update…"
            required
          />
          <div className="flex items-center justify-end">
            <button type="submit" className="hi5-btn-primary text-sm w-auto">
              Add update
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
