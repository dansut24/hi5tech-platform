// apps/app/src/app/(modules)/selfservice/kb/page.tsx
import Link from "next/link";

export const dynamic = "force-dynamic";

export default function KnowledgeBasePage() {
  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-xs opacity-70">Self Service</div>
          <h1 className="text-2xl sm:text-3xl font-extrabold mt-1">Knowledge Base</h1>
          <p className="text-sm opacity-75 mt-2">
            Demo page for now — next we’ll wire categories + articles + search.
          </p>
        </div>
        <Link href="/selfservice" className="hi5-btn-ghost text-sm">
          Back
        </Link>
      </div>

      <div className="hi5-panel p-6">
        <div className="text-sm font-semibold">Coming next</div>
        <ul className="mt-3 space-y-2 text-sm opacity-80">
          <li>• Categories + article pages</li>
          <li>• Global search results</li>
          <li>• “Was this helpful?” + feedback</li>
        </ul>
      </div>
    </div>
  );
}
