// apps/app/src/app/admin/billing/page.tsx
export default function AdminBillingPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Billing</h1>
        <p className="text-sm opacity-80 mt-1">
          Plan, invoices, usage and payment method.
        </p>
      </div>

      <div className="hi5-panel p-6">
        <h2 className="text-lg font-semibold">Billing isn’t wired yet</h2>
        <p className="text-sm opacity-75 mt-2">
          Next steps: Stripe customer per tenant, invoice history, usage limits.
        </p>

        <div className="mt-4 p-4 rounded-2xl border hi5-border">
          <div className="text-xs uppercase tracking-wide opacity-70">Recommended</div>
          <ul className="mt-2 text-sm space-y-1 opacity-80">
            <li>• Trial → paid conversion</li>
            <li>• Seats-based pricing</li>
            <li>• Usage tracking (tickets/devices)</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
