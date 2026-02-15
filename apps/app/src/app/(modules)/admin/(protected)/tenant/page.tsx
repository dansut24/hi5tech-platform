// apps/app/src/app/admin/tenant/page.tsx
export default function AdminTenantPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Tenant settings</h1>
        <p className="text-sm opacity-80 mt-1">
          Branding, modules, security and tenant-level configuration.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="hi5-panel p-6">
          <h2 className="text-lg font-semibold">Branding</h2>
          <p className="text-sm opacity-75 mt-1">
            Logo, accent colours, background and theme presets.
          </p>
          <div className="mt-4 text-sm opacity-70">
            Coming next: logo upload, accent picker, preview.
          </div>
        </div>

        <div className="hi5-panel p-6">
          <h2 className="text-lg font-semibold">Modules</h2>
          <p className="text-sm opacity-75 mt-1">
            Enable/disable ITSM, Control, Self Service and Admin.
          </p>
          <div className="mt-4 text-sm opacity-70">
            Coming next: toggle modules + set default landing.
          </div>
        </div>

        <div className="hi5-panel p-6">
          <h2 className="text-lg font-semibold">Security</h2>
          <p className="text-sm opacity-75 mt-1">
            Password policy, SSO, MFA requirements.
          </p>
          <div className="mt-4 text-sm opacity-70">
            Coming next: enforce MFA + configure OAuth/SSO providers.
          </div>
        </div>

        <div className="hi5-panel p-6">
          <h2 className="text-lg font-semibold">Support & contacts</h2>
          <p className="text-sm opacity-75 mt-1">
            Support email, timezone, address, notifications.
          </p>
          <div className="mt-4 text-sm opacity-70">
            Coming next: editable support email + timezone.
          </div>
        </div>
      </div>
    </div>
  );
}
