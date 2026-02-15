// apps/app/src/app/(modules)/admin/(protected)/settings/branding/page.tsx
import Link from "next/link";
import { ArrowLeft, Image as ImageIcon, Palette } from "lucide-react";

export default function AdminBrandingSettingsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <Link
            href="/admin/tenant"
            className="inline-flex items-center gap-2 text-sm opacity-80 hover:opacity-100 transition"
          >
            <ArrowLeft size={16} />
            Back to Tenant settings
          </Link>
          <h1 className="text-2xl font-semibold mt-2">Branding</h1>
          <p className="text-sm opacity-80 mt-1">
            Manage tenant logo, accent colours, backgrounds and theme presets.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="hi5-panel p-6">
          <div className="flex items-center gap-2">
            <ImageIcon size={18} className="opacity-80" />
            <h2 className="text-lg font-semibold">Logo</h2>
          </div>
          <p className="text-sm opacity-75 mt-1">
            Upload a tenant logo used across Admin, ITSM, Control and Self Service.
          </p>

          <div className="mt-4 rounded-2xl border hi5-border p-4">
            <div className="text-sm font-semibold">Coming next</div>
            <ul className="mt-2 text-sm opacity-75 list-disc pl-5 space-y-1">
              <li>Upload + crop</li>
              <li>Dark/light variants</li>
              <li>Supabase Storage + signed URLs</li>
            </ul>
          </div>

          <button className="hi5-btn-ghost mt-4" disabled>
            Upload logo (soon)
          </button>
        </div>

        <div className="hi5-panel p-6">
          <div className="flex items-center gap-2">
            <Palette size={18} className="opacity-80" />
            <h2 className="text-lg font-semibold">Theme</h2>
          </div>
          <p className="text-sm opacity-75 mt-1">
            Accent colours, card surfaces, glow intensity and preview.
          </p>

          <div className="mt-4 rounded-2xl border hi5-border p-4">
            <div className="text-sm font-semibold">Coming next</div>
            <ul className="mt-2 text-sm opacity-75 list-disc pl-5 space-y-1">
              <li>Accent picker + presets</li>
              <li>Background gradients</li>
              <li>Live preview switcher</li>
            </ul>
          </div>

          <button className="hi5-btn-ghost mt-4" disabled>
            Open theme editor (soon)
          </button>
        </div>
      </div>
    </div>
  );
}
