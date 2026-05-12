import AgentDownloadClient from "./ui/agent-download-client";

export const dynamic = "force-dynamic";

export default function ControlDownloadsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold">Agent Downloads</h1>
        <p className="text-sm opacity-75 mt-2 max-w-2xl">
          Generate tenant and group-specific install commands for the Windows agent.
          The installer stays generic; enrollment values are passed at install time.
        </p>
      </div>

      <AgentDownloadClient />
    </div>
  );
}
