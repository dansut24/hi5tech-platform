// apps/app/src/app/admin/audit/page.tsx
export default function AdminAuditPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Audit log</h1>
        <p className="text-sm opacity-80 mt-1">
          Track security and admin actions in this tenant.
        </p>
      </div>

      <div className="hi5-panel p-6">
        <h2 className="text-lg font-semibold">Audit log isn’t wired yet</h2>
        <p className="text-sm opacity-75 mt-2">
          Next steps: add an <span className="font-medium">audit_events</span> table, write events
          on key actions (invites, role changes, module toggles, logins).
        </p>

        <div className="mt-4 p-4 rounded-2xl border hi5-border">
          <div className="text-xs uppercase tracking-wide opacity-70">Events to capture</div>
          <ul className="mt-2 text-sm space-y-1 opacity-80">
            <li>• User invited / joined / removed</li>
            <li>• Role changed</li>
            <li>• Tenant settings changed</li>
            <li>• Billing plan changed</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
