import Link from "next/link";
import { cookies } from "next/headers";
import { createSupabaseServerClient } from "@hi5tech/auth";
import { getMemberTenantIds } from "@/lib/tenant";
import { addIncidentComment } from "./actions";
import { uploadIncidentAttachment } from "./attachments.actions";

function Badge({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-full border px-2 py-0.5 text-xs hi5-border opacity-80">
      {children}
    </span>
  );
}

function fmt(ts: string) {
  try {
    return new Date(ts).toLocaleString();
  } catch {
    return ts;
  }
}

async function supabaseServer() {
  const cookieStore = await cookies();

  return createSupabaseServerClient({
    get(name: string) {
      return cookieStore.get(name)?.value;
    },
    set(name: string, value: string, options: any) {
      cookieStore.set({ name, value, ...(options ?? {}) });
    },
    remove(name: string, options: any) {
      const anyStore = cookieStore as any;
      if (typeof anyStore.delete === "function") {
        anyStore.delete(name);
        return;
      }
      cookieStore.set({ name, value: "", ...(options ?? {}), maxAge: 0 });
    },
  });
}

export default async function IncidentDetail(props: {
  params: Promise<{ id: string }>;
}) {
  const { id: number } = await props.params;

  const supabase = await supabaseServer();
  const tenantIds = await getMemberTenantIds();

  const { data: incident, error } = await supabase
    .from("incidents")
    .select("id,tenant_id,number,title,description,status,priority,created_at,updated_at")
    .in(
      "tenant_id",
      tenantIds.length ? tenantIds : ["00000000-0000-0000-0000-000000000000"]
    )
    .eq("number", number)
    .maybeSingle();

  if (error) {
    return (
      <div className="space-y-3">
        <h1 className="text-2xl font-semibold">Incident {number}</h1>
        <div className="hi5-card p-4 text-sm text-red-600">{error.message}</div>
        <Link className="underline" href="/itsm/incidents">
          Back
        </Link>
      </div>
    );
  }

  if (!incident) {
    return (
      <div className="space-y-3">
        <h1 className="text-2xl font-semibold">Incident {number}</h1>
        <div className="hi5-card p-4 text-sm opacity-80">
          Not found in any of your tenant memberships.
        </div>
        <Link className="underline" href="/itsm/incidents">
          Back
        </Link>
      </div>
    );
  }

  const { data: comments, error: cErr } = await supabase
    .from("itsm_comments")
    .select("id,body,is_internal,created_at,created_by")
    .eq("tenant_id", incident.tenant_id)
    .eq("entity_type", "incident")
    .eq("entity_id", incident.id)
    .order("created_at", { ascending: false })
    .limit(50);

  const { data: attachments, error: aErr } = await supabase
    .from("itsm_attachments")
    .select("id,file_name,mime_type,byte_size,storage_path,created_at")
    .eq("tenant_id", incident.tenant_id)
    .eq("entity_type", "incident")
    .eq("entity_id", incident.id)
    .order("created_at", { ascending: false })
    .limit(50);

  // Signed URLs
  const signed: Record<string, string> = {};
  if (attachments && attachments.length) {
    for (const a of attachments) {
      const { data } = await supabase.storage
        .from("itsm-attachments")
        .createSignedUrl(a.storage_path, 60 * 10);
      if (data?.signedUrl) signed[a.id] = data.signedUrl;
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-end justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold truncate">{incident.number}</h1>
          <p className="opacity-80 truncate">{incident.title}</p>
        </div>
        <Link className="underline" href="/itsm/incidents">
          Back to list
        </Link>
      </div>

      <div className="grid gap-3 lg:grid-cols-3">
        <div className="hi5-card p-4 lg:col-span-2 space-y-4">
          <div>
            <div className="font-semibold">Summary</div>
            <div className="text-sm opacity-80 whitespace-pre-wrap mt-2">
              {incident.description || "No description."}
            </div>
          </div>

          <div>
            <div className="font-semibold">Add comment</div>
            <form action={addIncidentComment} className="mt-2 space-y-2">
              <input type="hidden" name="number" value={incident.number} />
              <textarea
                name="body"
                placeholder="Write an update…"
                className="w-full rounded-xl border px-3 py-2 bg-transparent hi5-border min-h-[96px]"
                required
              />
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <label className="text-sm flex items-center gap-2 opacity-80">
                  <input type="checkbox" name="is_internal" defaultChecked />
                  Internal note (techs only)
                </label>
                <button className="rounded-xl px-3 py-2 text-sm font-medium hi5-accent-btn">
                  Post comment
                </button>
              </div>
            </form>
          </div>

          <div>
            <div className="font-semibold">Comments</div>
            {cErr ? <div className="text-sm text-red-600 mt-2">{cErr.message}</div> : null}

            <div className="mt-2 space-y-2">
              {(comments ?? []).map((c) => (
                <div key={c.id} className="hi5-card p-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="text-xs opacity-70">{fmt(c.created_at)}</div>
                    <Badge>{c.is_internal ? "Internal" : "Public"}</Badge>
                  </div>
                  <div className="text-sm whitespace-pre-wrap mt-2">{c.body}</div>
                </div>
              ))}
              {!comments || comments.length === 0 ? (
                <div className="text-sm opacity-70">No comments yet.</div>
              ) : null}
            </div>
          </div>
        </div>

        <div className="hi5-card p-4 space-y-4">
          <div>
            <div className="font-semibold">Details</div>
            <div className="flex gap-2 flex-wrap mt-2">
              <Badge>Status: {String(incident.status).replace("_", " ")}</Badge>
              <Badge>Priority: {incident.priority}</Badge>
            </div>
            <div className="text-xs opacity-70 mt-2">Created: {fmt(incident.created_at)}</div>
            <div className="text-xs opacity-70">Updated: {fmt(incident.updated_at)}</div>
          </div>

          <div>
            <div className="font-semibold">Attachments</div>
            <form action={uploadIncidentAttachment} className="mt-2 space-y-2">
              <input type="hidden" name="number" value={incident.number} />
              <input
                type="file"
                name="file"
                className="w-full rounded-xl border px-3 py-2 bg-transparent hi5-border text-sm"
                required
              />
              <button className="rounded-xl px-3 py-2 text-sm font-medium hi5-accent-btn">
                Upload
              </button>
            </form>

            {aErr ? <div className="text-sm text-red-600 mt-2">{aErr.message}</div> : null}

            <div className="mt-3 space-y-2">
              {(attachments ?? []).map((a) => (
                <a
                  key={a.id}
                  href={signed[a.id] || "#"}
                  className="hi5-card p-3 block hover:bg-black/5 dark:hover:bg-white/5 transition"
                >
                  <div className="text-sm font-medium truncate">{a.file_name}</div>
                  <div className="text-xs opacity-70 mt-1">
                    {a.mime_type || "file"} •{" "}
                    {a.byte_size ? `${Math.round(a.byte_size / 1024)} KB` : "—"} •{" "}
                    {fmt(a.created_at)}
                  </div>
                </a>
              ))}
              {!attachments || attachments.length === 0 ? (
                <div className="text-sm opacity-70">No attachments yet.</div>
              ) : null}
            </div>

            <div className="text-xs opacity-60 mt-2">
              Links are signed (expire in ~10 minutes).
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
