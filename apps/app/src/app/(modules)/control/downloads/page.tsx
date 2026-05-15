import AgentDownloadClient from "./ui/agent-download-client";

export const dynamic = "force-dynamic";

export default function ControlDownloadsPage() {
  return (
    <div className="space-y-6">
      <div className="hi5-panel p-5">
        <div className="max-w-4xl">
          <div className="text-xs uppercase tracking-[0.22em] opacity-60">Control downloads</div>
          <h1 className="text-2xl sm:text-3xl font-extrabold mt-2">Agent Downloads</h1>
          <p className="text-sm opacity-75 mt-2 leading-relaxed">
            Create Windows agent enrolment packages, download the installer, copy silent deployment commands,
            and view MDM/RMM deployment instructions. The agent installs into a stable Hi5Tech path while tenant,
            group, and package identity are stored securely in ProgramData.
          </p>
        </div>
      </div>

      <AgentDownloadClient />
    </div>
  );
}
