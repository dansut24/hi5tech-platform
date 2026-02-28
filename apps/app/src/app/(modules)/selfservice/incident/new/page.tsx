// apps/app/src/app/(modules)/selfservice/incident/new/page.tsx
import Link from "next/link";
import RaiseIncidentClient from "./ui/raise-incident-client";

export const dynamic = "force-dynamic";

export default function NewSelfServiceIncidentPage() {
  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex items-start justify-between gap-3 mb-4">
        <div>
          <div className="text-xs opacity-70">Self Service</div>
          <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight">
            Raise an incident
          </h1>
          <p className="mt-2 text-sm opacity-70 max-w-xl">
            Tell us what&apos;s broken, how it affects you, and any details that help us reproduce it.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link href="/selfservice" className="hi5-btn-ghost text-sm">
            Back
          </Link>
        </div>
      </div>

      <RaiseIncidentClient />
    </div>
  );
}
