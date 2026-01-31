import Link from "next/link";

export default function KnowledgeArticle({ params }: { params: { slug: string } }) {
  return (
    <div className="space-y-4">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Article: {params.slug}</h1>
          <p className="opacity-80">Opens as a tab in the ITSM tab bar.</p>
        </div>
        <Link className="underline" href="/itsm/knowledge">Back</Link>
      </div>

      <div className="hi5-card p-4">
        <div className="font-semibold">Content</div>
        <div className="text-sm opacity-70 mt-1">
          Markdown-rendered content will be here.
        </div>
      </div>
    </div>
  );
}