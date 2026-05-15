import AgentDownloadClient from "./ui/agent-download-client";

export const dynamic = "force-dynamic";

export default function ControlDownloadsPage() {
  return (
    <div className="space-y-6">
      <div className="hi5-panel p-5">
        <div className="max-w-4xl">
          <div className="text-xs uppercase tracking-[0.22em] opacity-60">
            Control downloads
          </div>

          <h1 className="text-2xl sm:text-3xl font-extrabold mt-2">
            Agent Downloads
          </h1>

          <p className="text-sm opacity-75 mt-2 leading-relaxed">
            Create Windows agent enrolment packages, download named installers, copy silent
            deployment commands, and view MDM/RMM deployment guidance. The agent installs into a
            stable Hi5Tech path while tenant, group, and package identity is stored in ProgramData.
          </p>

          <div className="mt-4 rounded-2xl border hi5-border bg-black/5 dark:bg-white/5 p-3 text-xs opacity-75 leading-relaxed">
            Current mode: generated PowerShell command remains the production install method.
            The named EXE download is now prepared for the future provisioned-installer worker.
          </div>
        </div>
      </div>

      <AgentDownloadClient />
    </div>
  );
}
