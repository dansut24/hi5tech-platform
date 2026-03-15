import Link from "next/link";

export const dynamic = "force-dynamic";

export default function ControlDownloadsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold">Agent Downloads</h1>
        <p className="text-sm opacity-75 mt-2 max-w-2xl">
          Download the Windows agent installer and create enrollment packages
          that place devices into the correct tenant group and policy.
        </p>
      </div>

      <div className="hi5-panel p-5 space-y-4">
        <div>
          <div className="text-lg font-semibold">Windows Agent</div>
          <div className="text-sm opacity-70 mt-1">
            Placeholder installer for testing portal download flow.
          </div>
        </div>

        <div className="flex flex-wrap gap-3">
          <a
            href="/downloads/Hi5TechAgentSetup.exe"
            download
            className="hi5-btn-primary text-sm"
          >
            Download EXE
          </a>

          <Link href="/control/devices" className="hi5-btn-ghost text-sm">
            Back to Devices
          </Link>
        </div>
      </div>
    </div>
  );
}
