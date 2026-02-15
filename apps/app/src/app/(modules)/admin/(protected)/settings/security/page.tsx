// apps/app/src/app/(modules)/admin/(protected)/settings/security/page.tsx
import Link from "next/link";
import { ArrowLeft, ShieldCheck, KeyRound, Smartphone } from "lucide-react";

export default function AdminSecuritySettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/admin/tenant"
          className="inline-flex items-center gap-2 text-sm opacity-80 hover:opacity-100 transition"
        >
          <ArrowLeft size={16} />
          Back to Tenant settings
        </Link>
        <h1 className="text-2xl font-semibold mt-2">Security</h1>
        <p className="text-sm opacity-80 mt-1">
          Configure authentication, MFA requirements and SSO providers for this tenant.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="hi5-panel p-6">
          <div className="flex items-center gap-2">
            <ShieldCheck size={18} className="opacity-80" />
            <h2 className="text-lg font-semibold">Tenant security posture</h2>
          </div>

          <div className="mt-4 rounded-2xl border hi5-border p-4">
            <div className="text-xs uppercase tracking-wide opacity-70">Status</div>
            <div className="mt-1 text-2xl font-extrabold">Good</div>
            <div className="mt-1 text-sm opacity-75">2FA + SSO coming</div>
          </div>

          <div className="mt-4 text-sm opacity-70">
            Coming next: show compliance by user (MFA enabled / last sign-in / risky sign-ins).
          </div>
        </div>

        <div className="hi5-panel p-6">
          <div className="flex items-center gap-2">
            <KeyRound size={18} className="opacity-80" />
            <h2 className="text-lg font-semibold">Password policy</h2>
          </div>

          <div className="mt-4 rounded-2xl border hi5-border p-4">
            <div className="text-sm font-semibold">Coming next</div>
            <ul className="mt-2 text-sm opacity-75 list-disc pl-5 space-y-1">
              <li>Minimum length, complexity & expiry</li>
              <li>Lockout rules</li>
              <li>Force reset for selected users</li>
            </ul>
          </div>

          <button className="hi5-btn-ghost mt-4" disabled>
            Edit policy (soon)
          </button>
        </div>

        <div className="hi5-panel p-6">
          <div className="flex items-center gap-2">
            <Smartphone size={18} className="opacity-80" />
            <h2 className="text-lg font-semibold">MFA enforcement</h2>
          </div>

          <div className="mt-4 rounded-2xl border hi5-border p-4">
            <div className="text-sm font-semibold">Coming next</div>
            <ul className="mt-2 text-sm opacity-75 list-disc pl-5 space-y-1">
              <li>Require MFA for agents/admins</li>
              <li>Grace period enforcement</li>
              <li>Block legacy auth</li>
            </ul>
          </div>

          <button className="hi5-btn-ghost mt-4" disabled>
            Configure MFA (soon)
          </button>
        </div>

        <div className="hi5-panel p-6">
          <div className="flex items-center gap-2">
            <ShieldCheck size={18} className="opacity-80" />
            <h2 className="text-lg font-semibold">Single Sign-On (SSO)</h2>
          </div>

          <div className="mt-4 rounded-2xl border hi5-border p-4">
            <div className="text-sm font-semibold">Coming next</div>
            <ul className="mt-2 text-sm opacity-75 list-disc pl-5 space-y-1">
              <li>Microsoft Entra ID (Azure AD)</li>
              <li>Google Workspace</li>
              <li>SAML/OIDC configuration + metadata</li>
            </ul>
          </div>

          <button className="hi5-btn-ghost mt-4" disabled>
            Add provider (soon)
          </button>
        </div>
      </div>
    </div>
  );
}
