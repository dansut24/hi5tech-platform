import AssetsClient from "./ui/assets-client";

export const dynamic = "force-dynamic";

export default function AssetsPage() {
  return (
    <div className="space-y-6">
      <div className="hi5-panel p-5">
        <div className="max-w-4xl">
          <div className="text-xs uppercase tracking-[0.22em] opacity-60">
            ITSM assets
          </div>

          <h1 className="text-2xl sm:text-3xl font-extrabold mt-2">
            Assets
          </h1>

          <p className="text-sm opacity-75 mt-2 leading-relaxed">
            Track devices and configuration items for ITSM. Assets can be created manually now,
            imported from CSV or Intune later, and linked to live Control devices when the tenant
            has the Control module enabled.
          </p>
        </div>
      </div>

      <AssetsClient />
    </div>
  );
}
