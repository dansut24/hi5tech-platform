import Link from "next/link";
import { redirect } from "next/navigation";
import TerminalPanel from "../../[id]/ui/terminal-panel";
import FileBrowserPanel from "../../[id]/ui/file-browser-panel";
import ServicesPanel from "../../[id]/ui/services-panel";
import ActivityPanel from "../../[id]/ui/activity-panel";
import RemotePanel from "../../[id]/ui/remote-panel";
import { getActiveTenantId } from "@/lib/tenant";
import { getTenantFeatures } from "@/lib/entitlements";

export const dynamic = "force-dynamic";

function TabLink({
  href,
  active,
  label,
  locked,
}: {
  href: string;
  active: boolean;
  label: string;
  locked?: boolean;
}) {
  if (locked) {
    return (
      <span className="rounded-2xl px-3 py-2 text-sm border hi5-border opacity-50 cursor-not-allowed">
        {label} 🔒
      </span>
    );
  }

  return (
    <Link
      href={href}
      className={[
        "rounded-2xl px-3 py-2 text-sm border hi5-border transition",
        active
          ? "bg-[rgba(var(--hi5-accent),0.10)] border-[rgba(var(--hi5-accent),0.28)]"
          : "hover:bg-black/5 dark:hover:bg-white/5",
      ].join(" ")}
    >
      {label}
    </Link>
  );
}

function LockedButton({ label }: { label: string }) {
  return (
    <button
      className="hi5-btn-ghost text-sm opacity-60"
      type="button"
      disabled
      title="Premium feature"
    >
      {label} 🔒
    </button>
  );
}

export default async function DevicePage({
  params,
  searchParams,
}: {
  params: Promise<{ deviceId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { deviceId } = await params;
  const id = deviceId;
  const sp = await searchParams;
  const tab = String(sp.tab || "overview");

  const tenantId = await getActiveTenantId();
  const features = await getTenantFeatures(tenantId);

  const canInventory = features.devices_inventory === true;
  const canRemote = features.remote_control === true;
  const canTerminal = features.remote_terminal === true;
  const canFiles = features.remote_files === true;

  if (!canInventory) {
    redirect("/itsm/incidents");
  }

  if (tab === "remote" && !canRemote) {
    redirect(`/control/devices/${encodeURIComponent(id)}?tab=overview`);
  }

  if (tab === "terminal" && !canTerminal) {
    redirect(`/control/devices/${encodeURIComponent(id)}?tab=overview`);
  }

  if (tab === "files" && !canFiles) {
    redirect(`/control/devices/${encodeURIComponent(id)}?tab=overview`);
  }

  return (
    <div className="space-y-5">
      <div className="hi5-panel p-5">
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
          <div>
            <div className="text-xs opacity-70">Device</div>
            <h1 className="text-2xl font-extrabold mt-1">{id}</h1>
            <p className="text-sm opacity-75 mt-2">
              Remote access, terminal, file browser and service management.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            {canRemote ? (
              <Link className="hi5-btn-primary text-sm" href={`/control/devices/${encodeURIComponent(id)}?tab=remote`}>
                Connect
              </Link>
            ) : (
              <LockedButton label="Connect" />
            )}

            {canTerminal ? (
              <Link className="hi5-btn-ghost text-sm" href={`/control/devices/${encodeURIComponent(id)}?tab=terminal`}>
                Terminal
              </Link>
            ) : (
              <LockedButton label="Terminal" />
            )}

            {canFiles ? (
              <Link className="hi5-btn-ghost text-sm" href={`/control/devices/${encodeURIComponent(id)}?tab=files`}>
                Files
              </Link>
            ) : (
              <LockedButton label="Files" />
            )}

            <Link className="hi5-btn-ghost text-sm" href={`/control/devices/${encodeURIComponent(id)}?tab=services`}>
              Services
            </Link>

            <button className="hi5-btn-ghost text-sm" type="button" title="Coming soon">
              Reboot
            </button>

            <button className="hi5-btn-ghost text-sm" type="button" title="Coming soon">
              Screenshot
            </button>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <TabLink href={`/control/devices/${encodeURIComponent(id)}?tab=overview`} active={tab === "overview"} label="Overview" />
          <TabLink href={`/control/devices/${encodeURIComponent(id)}?tab=remote`} active={tab === "remote"} label="Remote" locked={!canRemote} />
          <TabLink href={`/control/devices/${encodeURIComponent(id)}?tab=terminal`} active={tab === "terminal"} label="Terminal" locked={!canTerminal} />
          <TabLink href={`/control/devices/${encodeURIComponent(id)}?tab=files`} active={tab === "files"} label="Files" locked={!canFiles} />
          <TabLink href={`/control/devices/${encodeURIComponent(id)}?tab=services`} active={tab === "services"} label="Services" />
          <TabLink href={`/control/devices/${encodeURIComponent(id)}?tab=activity`} active={tab === "activity"} label="Activity" />
        </div>
      </div>

      <div className="hi5-panel p-5">
        {tab === "overview" && (
          <div className="space-y-4">
            <div className="text-lg font-semibold">Overview</div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="hi5-card p-4">
                <div className="text-xs opacity-70">CPU</div>
                <div className="text-2xl font-extrabold mt-1">—</div>
                <div className="text-xs opacity-70 mt-1">wire to metrics later</div>
              </div>

              <div className="hi5-card p-4">
                <div className="text-xs opacity-70">Memory</div>
                <div className="text-2xl font-extrabold mt-1">—</div>
                <div className="text-xs opacity-70 mt-1">wire to metrics later</div>
              </div>

              <div className="hi5-card p-4">
                <div className="text-xs opacity-70">Disk</div>
                <div className="text-2xl font-extrabold mt-1">—</div>
                <div className="text-xs opacity-70 mt-1">wire to metrics later</div>
              </div>
            </div>

            <div className="hi5-card p-4">
              <div className="text-sm font-semibold">Premium actions</div>
              <p className="text-sm opacity-75 mt-2">
                Remote control, terminal and file browser are controlled by tenant entitlements.
              </p>
            </div>
          </div>
        )}

        {tab === "remote" && <RemotePanel deviceId={id} />}
        {tab === "terminal" && <TerminalPanel deviceId={id} />}
        {tab === "files" && <FileBrowserPanel deviceId={id} />}
        {tab === "services" && <ServicesPanel deviceId={id} />}
        {tab === "activity" && <ActivityPanel deviceId={id} />}

        {tab !== "overview" &&
          tab !== "remote" &&
          tab !== "terminal" &&
          tab !== "files" &&
          tab !== "services" &&
          tab !== "activity" && (
            <div>
              <div className="text-lg font-semibold capitalize">{tab}</div>
              <p className="text-sm opacity-75 mt-2">This tab is coming soon.</p>
            </div>
          )}
      </div>
    </div>
  );
}
