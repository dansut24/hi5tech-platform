import Link from "next/link";

function Card({
  title,
  desc,
  href,
}: {
  title: string;
  desc: string;
  href: string;
}) {
  return (
    <Link
      href={href}
      className="hi5-panel p-5 transition hover:translate-y-[-1px] hover:bg-black/5 dark:hover:bg-white/5"
    >
      <div className="font-semibold">{title}</div>
      <div className="text-sm opacity-75 mt-1">{desc}</div>
    </Link>
  );
}

export default function ItsmSettingsPage() {
  return (
    <div className="space-y-4">
      <div className="hi5-panel p-5">
        <div className="text-lg font-semibold">Settings</div>
        <div className="text-sm opacity-75 mt-1">
          Manage how ITSM looks and behaves for you.
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <Card
          title="Sidebar"
          desc="Adjust sidebar width and desktop behaviour."
          href="/itsm/settings/sidebar"
        />

        {/* Add more settings cards here later */}
        {/* <Card title="Notifications" desc="Coming soon." href="/itsm/settings/notifications" /> */}
      </div>
    </div>
  );
}
