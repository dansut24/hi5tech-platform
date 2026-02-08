// apps/app/src/app/(modules)/admin/settings/page.tsx
import Link from "next/link";

export const dynamic = "force-dynamic";

export default function AdminSettingsIndex() {
  return (
    <div className="min-h-dvh p-4 sm:p-8">
      <div className="hi5-panel p-6">
        <div className="text-xs opacity-70">Admin</div>
        <h1 className="text-2xl font-extrabold mt-1">Settings</h1>
        <p className="text-sm opacity-75 mt-2">
          Update your company info, branding, and integrations any time.
        </p>
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <Link
          href="/admin/settings/company"
          className="hi5-card rounded-2xl border hi5-border p-5 hover:bg-black/5 dark:hover:bg-white/5 transition"
        >
          <div className="text-lg font-semibold">Company</div>
          <div className="text-sm opacity-80 mt-1">Name, support email, timezone, allowed domains</div>
        </Link>

        <Link
          href="/admin/settings/branding"
          className="hi5-card rounded-2xl border hi5-border p-5 hover:bg-black/5 dark:hover:bg-white/5 transition"
        >
          <div className="text-lg font-semibold">Branding</div>
          <div className="text-sm opacity-80 mt-1">Logo + theme presets + colors + glow</div>
        </Link>

        <Link
          href="/admin/settings/integrations/microsoft"
          className="hi5-card rounded-2xl border hi5-border p-5 hover:bg-black/5 dark:hover:bg-white/5 transition"
        >
          <div className="text-lg font-semibold">Microsoft</div>
          <div className="text-sm opacity-80 mt-1">Enable integration, tenant id (OAuth later)</div>
        </Link>
      </div>
    </div>
  );
}
