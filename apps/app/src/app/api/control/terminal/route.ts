// apps/app/src/app/api/control/terminal/route.ts
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// NOTE: Next.js route handlers don't directly host WebSocket upgrades in the standard runtime.
// We'll proxy WebSocket at the edge or route terminal WS directly to your Go server.
// For now: return 501 so the UI can show "not wired yet".
export async function GET() {
  return NextResponse.json(
    { error: "Terminal WS not wired yet. Point the UI to the Go control server WS endpoint." },
    { status: 501, headers: { "Cache-Control": "no-store" } }
  );
}
