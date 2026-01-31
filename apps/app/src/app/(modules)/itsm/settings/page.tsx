import Link from "next/link";

export default function ITSMSettings() {
  return (
    <div className="space-y-4">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">ITSM Settings</h1>
          <p className="opacity-80">Personal + workspace preferences</p>
        </div>
        <Link className="underline" href="/itsm">Back</Link>
      </div>

      <div className="hi5-card p-4 space-y-2">
        <div className="font-semibold">Appearance</div>
        <Link className="underline" href="/itsm/settings/theme">Theme</Link>
        <div className="text-sm opacity-70">Light / dark, accent colour, glass opacity.</div>
      </div>
    </div>
  );
}