// apps/app/src/app/api/control/services/route.ts
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * This is a stub/proxy placeholder.
 * Next step: proxy to your Go control server (Postgres-backed) endpoints.
 *
 * Suggested Go endpoints:
 *   GET  https://rmm.hi5tech.co.uk/api/services?device_id=...
 *   POST https://rmm.hi5tech.co.uk/api/services/action  { device_id, name, action }
 */

export async function GET(req: Request) {
  // For now return a safe empty list so UI renders without exploding.
  // Once wired, replace with fetch() to Go API.
  const url = new URL(req.url);
  const deviceId = url.searchParams.get("device_id") || "";

  return NextResponse.json(
    {
      device_id: deviceId,
      services: [],
    },
    { status: 200, headers: { "Cache-Control": "no-store" } }
  );
}

export async function POST(req: Request) {
  // For now: return 501 until backend exists.
  // UI will show a friendly error.
  const body = await req.json().catch(() => ({}));

  return NextResponse.json(
    {
      ok: false,
      error: "Not wired yet. Implement proxy to Go control server.",
      received: body,
    },
    { status: 501, headers: { "Cache-Control": "no-store" } }
  );
}
