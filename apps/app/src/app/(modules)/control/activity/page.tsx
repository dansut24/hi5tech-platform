import ActivityClient from "./ui/activity-client";

export const dynamic = "force-dynamic";

export default function ControlActivityPage() {
  return (
    <div className="space-y-4 sm:space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold">Activity</h1>
        <p className="text-sm opacity-75 mt-2 max-w-2xl">
          Tenant-wide audit trail: device check-ins, jobs, terminal sessions, file activity, and admin actions.
        </p>
      </div>

      <ActivityClient />
    </div>
  );
}
