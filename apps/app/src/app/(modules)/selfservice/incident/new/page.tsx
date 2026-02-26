// apps/app/src/app/(modules)/selfservice/incident/new/page.tsx
import Link from "next/link";
import { createIncident } from "./actions";

export const dynamic = "force-dynamic";
export const runtime = "nodejs"; // IMPORTANT: make server actions reliably see auth cookies

export default function NewSelfServiceIncidentPage() {
  return (
    <div className="max-w-3xl mx-auto">
      {/* Header */}
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
          <button form="incident-form" type="submit" className="hi5-btn-primary text-sm">
            Submit
          </button>
        </div>
      </div>

      {/* Form */}
      <form
        id="incident-form"
        action={createIncident}
        className="hi5-panel border hi5-border rounded-3xl p-4 sm:p-6 space-y-4"
      >
        <div>
          <label className="text-sm opacity-80">Title</label>
          <input
            name="title"
            required
            className="hi5-input mt-2"
            placeholder="e.g. Can’t access email"
          />
        </div>

        <div>
          <label className="text-sm opacity-80">Description</label>
          <textarea
            name="description"
            required
            rows={6}
            className="hi5-input mt-2"
            placeholder="What happened? What did you expect? Any error messages?"
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="text-sm opacity-80">Priority</label>
            <select name="priority" defaultValue="medium" className="hi5-input mt-2">
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="critical">Critical</option>
            </select>
          </div>

          <div>
            <label className="text-sm opacity-80">Impact</label>
            <select name="impact" defaultValue="just_me" className="hi5-input mt-2">
              <option value="just_me">Just me</option>
              <option value="team">My team</option>
              <option value="site">Whole site</option>
            </select>
          </div>
        </div>

        <div className="text-xs opacity-60">
          On submit, this will create a real incident in Supabase and redirect you to it.
        </div>
      </form>
    </div>
  );
}
