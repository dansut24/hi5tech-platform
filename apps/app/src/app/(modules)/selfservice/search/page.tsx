// apps/app/src/app/(modules)/selfservice/search/page.tsx
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function SelfServiceSearchPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const q = String(sp.q || "").trim();

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-xs opacity-70">Self Service</div>
          <h1 className="text-2xl sm:text-3xl font-extrabold mt-1">Search</h1>
          <p className="text-sm opacity-75 mt-2">Query: <span className="font-semibold">{q || "—"}</span></p>
        </div>
        <Link href="/selfservice" className="hi5-btn-ghost text-sm">
          Back
        </Link>
      </div>

      <div className="hi5-panel p-6">
        <div className="text-sm font-semibold">Results (demo)</div>
        <p className="text-sm opacity-75 mt-2">
          Next we’ll search KB + tickets + requests from Supabase and show real results here.
        </p>
      </div>
    </div>
  );
}
