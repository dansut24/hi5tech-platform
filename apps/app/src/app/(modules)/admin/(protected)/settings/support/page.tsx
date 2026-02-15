// apps/app/src/app/(modules)/admin/(protected)/settings/support/page.tsx
import Link from "next/link";
import { ArrowLeft, LifeBuoy, Mail, Clock, Bell } from "lucide-react";

export default function AdminSupportSettingsPage() {
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
        <h1 className="text-2xl font-semibold mt-2">Support & contacts</h1>
        <p className="text-sm opacity-80 mt-1">
          Configure support contact details, timezone and customer notifications.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="hi5-panel p-6">
          <div className="flex items-center gap-2">
            <Mail size={18} className="opacity-80" />
            <h2 className="text-lg font-semibold">Support email</h2>
          </div>
          <p className="text-sm opacity-75 mt-1">
            Used in Self Service, ticket notifications and portal footers.
          </p>

          <div className="mt-4 rounded-2xl border hi5-border p-4">
            <div className="text-sm font-semibold">Coming next</div>
            <ul className="mt-2 text-sm opacity-75 list-disc pl-5 space-y-1">
              <li>Edit support email + reply-to address</li>
              <li>Email templates (branding)</li>
              <li>Inbound email → ticket creation</li>
            </ul>
          </div>

          <button className="hi5-btn-ghost mt-4" disabled>
            Edit email (soon)
          </button>
        </div>

        <div className="hi5-panel p-6">
          <div className="flex items-center gap-2">
            <Clock size={18} className="opacity-80" />
            <h2 className="text-lg font-semibold">Timezone</h2>
          </div>
          <p className="text-sm opacity-75 mt-1">
            Used for SLAs, working hours, reports and timestamps.
          </p>

          <div className="mt-4 rounded-2xl border hi5-border p-4">
            <div className="text-sm font-semibold">Coming next</div>
            <ul className="mt-2 text-sm opacity-75 list-disc pl-5 space-y-1">
              <li>Select timezone per tenant</li>
              <li>Business hours calendars</li>
              <li>SLA pause rules by status</li>
            </ul>
          </div>

          <button className="hi5-btn-ghost mt-4" disabled>
            Set timezone (soon)
          </button>
        </div>

        <div className="hi5-panel p-6 lg:col-span-2">
          <div className="flex items-center gap-2">
            <Bell size={18} className="opacity-80" />
            <h2 className="text-lg font-semibold">Notifications</h2>
          </div>
          <p className="text-sm opacity-75 mt-1">
            Control which events trigger emails and in-app notifications.
          </p>

          <div className="mt-4 rounded-2xl border hi5-border p-4">
            <div className="text-sm font-semibold">Coming next</div>
            <ul className="mt-2 text-sm opacity-75 list-disc pl-5 space-y-1">
              <li>Ticket created/assigned/updated</li>
              <li>Approval requested/approved/rejected</li>
              <li>Service status updates</li>
            </ul>
          </div>

          <button className="hi5-btn-ghost mt-4" disabled>
            Configure notifications (soon)
          </button>
        </div>
      </div>

      <div className="hi5-panel p-6">
        <div className="flex items-center gap-2">
          <LifeBuoy size={18} className="opacity-80" />
          <h2 className="text-lg font-semibold">Tenant contact details</h2>
        </div>
        <p className="text-sm opacity-75 mt-1">
          Useful for billing, invoices, legal notices and service communications.
        </p>

        <div className="mt-4 text-sm opacity-70">
          Coming next: edit address, phone, billing contact and notification recipients.
        </div>
      </div>
    </div>
  );
}
