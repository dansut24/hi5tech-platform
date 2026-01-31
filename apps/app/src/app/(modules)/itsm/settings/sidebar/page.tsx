import Link from "next/link";
import SidebarSettingsClient from "./sidebar-settings-client";

export default function SidebarSettingsPage() {
  return (
    <div className="space-y-4">
      <div className="hi5-panel p-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-lg font-semibold">Sidebar</div>
            <div className="text-sm opacity-75 mt-1">
              These settings affect ITSM only.
            </div>
          </div>

          <Link
            href="/itsm/settings"
            className="rounded-xl border hi5-border px-3 py-2 text-sm hover:bg-black/5 dark:hover:bg-white/5 transition"
          >
            Back
          </Link>
        </div>
      </div>

      <SidebarSettingsClient />
    </div>
  );
}
