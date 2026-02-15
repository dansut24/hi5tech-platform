import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * Stub for tenant-wide + device-scoped activity log.
 * Later: proxy to Go/Postgres, e.g.
 *   GET https://rmm.hi5tech.co.uk/api/activity?device_id=&kind=&q=
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const deviceId = url.searchParams.get("device_id");
  const kind = url.searchParams.get("kind");
  const q = url.searchParams.get("q");

  // Empty list for now, UI-ready.
  return NextResponse.json(
    {
      device_id: deviceId,
      kind,
      q,
      rows: [],
    },
    { status: 200, headers: { "Cache-Control": "no-store" } }
  );
}
