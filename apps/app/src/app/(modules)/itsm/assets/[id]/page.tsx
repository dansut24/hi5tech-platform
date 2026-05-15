import Link from "next/link";
import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";
import { getEffectiveHost, parseTenantHost } from "@/lib/tenant/tenant-from-host";

export const dynamic = "force-dynamic";

async function getTenantId() {
  const supabase = await supabaseServer();

  const { data: userRes } = await supabase.auth.getUser();
  const me = userRes.user;

  if (!me) {
    redirect("/login");
  }

  const host = getEffectiveHost(await headers());
  const parsed = parseTenantHost(host);

  if (parsed.subdomain) {
    const { data: tenant } = await supabase
      .from("tenants")
      .select("id")
      .eq("domain", parsed.rootDomain)
      .eq("subdomain", parsed.subdomain)
      .maybeSingle();

    if (tenant?.id) {
      return { supabase, tenantId: tenant.id };
    }
  }

  const { data: membership } = await supabase
    .from("memberships")
    .select("tenant_id")
    .eq("user_id", me.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!membership?.tenant_id) {
    redirect("/apps");
  }

  return { supabase, tenantId: membership.tenant_id };
}

function text(value: any, fallback = "—") {
  if (value === null || value === undefined || value === "") return fallback;
  return String(value);
}

function formatDate(value: any) {
  if (!value) return "—";

  const d = new Date(value);

  if (Number.isNaN(d.getTime())) {
    return String(value);
  }

  return d.toLocaleString("en-GB", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function Field({ label, value }: { label: string; value: any }) {
  return (
    <div className="rounded-2xl border hi5-border bg-black/5 dark:bg-white/5 p-3">
      <div className="text-xs opacity-65">{label}</div>
      <div className="text-sm font-semibold mt-1 break-words">{text(value)}</div>
    </div>
  );
}

function Badge({
  children,
  tone = "neutral",
}: {
  children: React.ReactNode;
  tone?: "good" | "bad" | "warning" | "neutral";
}) {
  const cls =
    tone === "good"
      ? "border-emerald-500/25 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
      : tone === "bad"
        ? "border-red-500/25 bg-red-500/10 text-red-700 dark:text-red-300"
        : tone === "warning"
          ? "border-amber-500/25 bg-amber-500/10 text-amber-700 dark:text-amber-200"
          : "hi5-border bg-black/5 dark:bg-white/5";

  return (
    <span className={["inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold", cls].join(" ")}>
      {children}
    </span>
  );
}

export default async function AssetsDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const assetId = id;

  const { supabase, tenantId } = await getTenantId();

  const { data: asset, error } = await supabase
    .from("assets")
    .select("*")
    .eq("tenant_id", tenantId)
    .eq("id", assetId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  if (!asset) {
    notFound();
  }

  let linkedDevice: any = null;

  if (asset.control_device_id) {
    const { data } = await supabase
      .from("devices")
      .select("device_id, hostname, os, arch, agent_version, online, last_seen_at, group_id")
      .eq("tenant_id", tenantId)
      .eq("device_id", asset.control_device_id)
      .maybeSingle();

    linkedDevice = data ?? null;
  }

  return (
    <div className="space-y-5">
      <div className="hi5-panel p-5">
        <div className="flex flex-col xl:flex-row xl:items-start xl:justify-between gap-4">
          <div>
            <div className="flex flex-wrap gap-2">
              <Badge>{text(asset.asset_type, "device")}</Badge>
              <Badge tone={asset.status === "active" ? "good" : asset.status === "retired" ? "bad" : "neutral"}>
                {text(asset.status)}
              </Badge>
              <Badge>Source: {text(asset.source)}</Badge>
              {linkedDevice ? (
                <Badge tone={linkedDevice.online ? "good" : "bad"}>
                  {linkedDevice.online ? "Control online" : "Control offline"}
                </Badge>
              ) : (
                <Badge tone="warning">Not linked to Control</Badge>
              )}
            </div>

            <h1 className="text-2xl sm:text-3xl font-extrabold mt-3 break-words">
              {text(asset.name)}
            </h1>

            <p className="text-sm opacity-75 mt-2">
              {text(asset.hostname, "No hostname")} · {text(asset.manufacturer)} {text(asset.model, "")}
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Link href="/itsm/assets" className="hi5-btn-ghost text-sm">
              Back to assets
            </Link>

            {linkedDevice ? (
              <Link
                href={`/control/devices/${encodeURIComponent(linkedDevice.device_id)}?tab=overview`}
                className="hi5-btn-primary text-sm"
              >
                Open in Control
              </Link>
            ) : (
              <button type="button" className="hi5-btn-ghost text-sm opacity-60" disabled>
                Not linked to Control
              </button>
            )}

            <button type="button" className="hi5-btn-ghost text-sm opacity-60" disabled>
              Create ticket
            </button>
          </div>
        </div>
      </div>

      <section className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <div className="hi5-card p-4 space-y-3">
          <div className="text-sm font-bold">Asset identity</div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-1 gap-3">
            <Field label="Asset name" value={asset.name} />
            <Field label="Hostname" value={asset.hostname} />
            <Field label="Serial number" value={asset.serial_number} />
            <Field label="Asset tag" value={asset.asset_tag} />
            <Field label="External ID" value={asset.external_id} />
          </div>
        </div>

        <div className="hi5-card p-4 space-y-3">
          <div className="text-sm font-bold">Hardware / OS</div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-1 gap-3">
            <Field label="Manufacturer" value={asset.manufacturer} />
            <Field label="Model" value={asset.model} />
            <Field label="Operating system" value={asset.operating_system} />
            <Field label="Warranty status" value={asset.warranty_status} />
            <Field label="Warranty expires" value={formatDate(asset.warranty_expires_at)} />
          </div>
        </div>

        <div className="hi5-card p-4 space-y-3">
          <div className="text-sm font-bold">Ownership</div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-1 gap-3">
            <Field label="Assigned user" value={asset.assigned_user_name} />
            <Field label="Assigned email" value={asset.assigned_user_email} />
            <Field label="Department" value={asset.department} />
            <Field label="Location" value={asset.location} />
            <Field label="Updated" value={formatDate(asset.updated_at)} />
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <div className="hi5-card p-4 space-y-3">
          <div className="text-sm font-bold">Control device link</div>

          {linkedDevice ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <Field label="Device ID" value={linkedDevice.device_id} />
              <Field label="Hostname" value={linkedDevice.hostname} />
              <Field label="OS" value={linkedDevice.os} />
              <Field label="Architecture" value={linkedDevice.arch} />
              <Field label="Agent version" value={linkedDevice.agent_version} />
              <Field label="Online" value={linkedDevice.online ? "Yes" : "No"} />
              <Field label="Last seen" value={formatDate(linkedDevice.last_seen_at)} />
            </div>
          ) : (
            <div className="rounded-2xl border hi5-border bg-black/5 dark:bg-white/5 p-4 text-sm opacity-75 leading-relaxed">
              This asset is not linked to a live Control device yet. Later, assets can be matched automatically by
              serial number, hostname, Intune device ID or agent identity.
            </div>
          )}
        </div>

        <div className="hi5-card p-4 space-y-3">
          <div className="text-sm font-bold">Notes</div>

          <div className="rounded-2xl border hi5-border bg-black/5 dark:bg-white/5 p-4 text-sm whitespace-pre-wrap min-h-[160px]">
            {text(asset.notes, "No notes yet.")}
          </div>
        </div>
      </section>

      <section className="hi5-card p-4">
        <div className="text-sm font-bold">Coming next</div>
        <p className="text-sm opacity-70 mt-2 leading-relaxed">
          This page is ready for asset editing, CSV/Intune import history, linked tickets, and remote actions when a
          Control device is matched.
        </p>
      </section>
    </div>
  );
}
