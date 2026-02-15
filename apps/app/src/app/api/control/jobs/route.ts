import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * Stub for jobs/command runner.
 * Later: proxy to Go/Postgres:
 *  GET  https://rmm.hi5tech.co.uk/api/jobs
 *  POST https://rmm.hi5tech.co.uk/api/jobs  { kind, command, targets }
 */
export async function GET() {
  return NextResponse.json(
    {
      jobs: [],
    },
    { status: 200, headers: { "Cache-Control": "no-store" } }
  );
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  return NextResponse.json(
    {
      ok: false,
      error: "Not wired yet. Implement Go/Postgres job creation + agent polling.",
      received: body,
    },
    { status: 501, headers: { "Cache-Control": "no-store" } }
  );
}
