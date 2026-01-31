import Link from "next/link";
import ThemeSettingsClient from "./theme-settings-client";

export default function ThemeSettingsPage() {
  return (
    <div className="space-y-4">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Theme</h1>
          <p className="opacity-80">Customise colours + glass intensity</p>
        </div>
        <div className="flex gap-3">
          <Link className="underline" href="/itsm/settings">Settings</Link>
          <Link className="underline" href="/itsm">Back</Link>
        </div>
      </div>

      <ThemeSettingsClient />
    </div>
  );
}