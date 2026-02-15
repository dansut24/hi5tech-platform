// apps/app/src/app/(modules)/control/[id]/page.tsx
import Link from "next/link";
import TerminalPanel from "./ui/terminal-panel";
import FileBrowserPanel from "./ui/file-browser-panel";

export const dynamic = "force-dynamic";

function TabLink({ href, active, label }: { href: string; active: boolean; label: string }) {
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

export default async function DevicePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { id } = await params;
  const sp = await searchParams;
  const tab = String(sp.tab || "overview");

  return (
    <div className="space-y-5">
      <div className="hi5-panel p-5">
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
          <div>
            <div className="text-xs opacity-70">Device</div>
            <h1 className="text-2xl font-extrabold mt-1">{id}</h1>
            <p className="text-sm opacity-75 mt-2">
              Device tools live here. Remote screen will be handled by your deep-link viewer later.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Link className="hi5-btn-primary text-sm" href={`/control/${id}?tab=remote`}>
              Remote
            </Link>
            <Link className="hi5-btn-ghost text-sm" href={`/control/${id}?tab=terminal`}>
              Terminal
            </Link>
            <Link className="hi5-btn-ghost text-sm" href={`/control/${id}?tab=files`}>
              Files
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
          <TabLink href={`/control/${id}?tab=overview`} active={tab === "overview"} label="Overview" />
          <TabLink href={`/control/${id}?tab=remote`} active={tab === "remote"} label="Remote" />
          <TabLink href={`/control/${id}?tab=terminal`} active={tab === "terminal"} label="Terminal" />
          <TabLink href={`/control/${id}?tab=files`} active={tab === "files"} label="Files" />
          <TabLink href={`/control/${id}?tab=services`} active={tab === "services"} label="Services" />
          <TabLink href={`/control/${id}?tab=activity`} active={tab === "activity"} label="Activity" />
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
              <div className="text-sm font-semibold">Recent events</div>
              <ul className="mt-2 text-sm opacity-80 space-y-2">
                <li>• Device checked-in</li>
                <li>• Policy applied</li>
                <li>• Service restarted</li>
              </ul>
            </div>
          </div>
        )}

        {tab === "terminal" && <TerminalPanel deviceId={id} />}

        {tab === "files" && <FileBrowserPanel deviceId={id} />}

        {tab !== "overview" && tab !== "terminal" && tab !== "files" && (
          <div>
            <div className="text-lg font-semibold capitalize">{tab}</div>
            <p className="text-sm opacity-75 mt-2">
              This tab is next. Terminal and Files are now live UI panels; the others will be wired to your Go control
              server APIs.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
