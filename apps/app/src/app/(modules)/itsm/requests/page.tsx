import Link from "next/link";

export default function ServiceRequestsList() {
  return (
    <div className="space-y-4">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">ServiceRequests</h1>
          <p className="opacity-80">List view (mobile-friendly cards + desktop table later).</p>
        </div>
        <Link className="rounded-xl border px-3 py-2 text-sm hi5-border" href="/itsm/requests/SR-000001">
          Open example
        </Link>
      </div>

      <div className="hi5-card p-4">
        <div className="text-sm opacity-70">Next step:</div>
        <ul className="list-disc pl-5 mt-2 text-sm opacity-80 space-y-1">
          <li>Search + filters</li>
          <li>Create new</li>
          <li>Status badges</li>
          <li>Table on desktop / cards on mobile</li>
        </ul>
      </div>
    </div>
  );
}