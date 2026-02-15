import JobsClient from "./ui/jobs-client";

export const dynamic = "force-dynamic";

export default function ControlJobsPage() {
  return (
    <div className="space-y-4 sm:space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold">Jobs</h1>
        <p className="text-sm opacity-75 mt-2 max-w-2xl">
          Run commands across devices and track results. This is the foundation for scripts, patching, and automation.
        </p>
      </div>

      <JobsClient />
    </div>
  );
}
