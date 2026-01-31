import Link from "next/link";

export default function KnowledgeList() {
  return (
    <div className="space-y-4">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Knowledge Base</h1>
          <p className="opacity-80">Articles for techs and self-service users.</p>
        </div>
        <Link className="rounded-xl border px-3 py-2 text-sm hi5-border" href="/itsm/knowledge/getting-started">
          Open example
        </Link>
      </div>

      <div className="hi5-card p-4">
        <div className="text-sm opacity-70">Next step:</div>
        <ul className="list-disc pl-5 mt-2 text-sm opacity-80 space-y-1">
          <li>Search</li>
          <li>Categories + tags</li>
          <li>Markdown editor</li>
          <li>Publish workflow</li>
        </ul>
      </div>
    </div>
  );
}