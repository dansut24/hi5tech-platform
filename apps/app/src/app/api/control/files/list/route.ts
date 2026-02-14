// apps/app/src/app/api/control/files/list/route.ts
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  // When you’re ready, proxy to your Go control server:
  // const url = new URL(req.url);
  // const deviceId = url.searchParams.get("device_id");
  // const path = url.searchParams.get("path");
  // fetch(`https://rmm.hi5tech.co.uk/api/files/list?device_id=${...}&path=${...}`, ...)

  return NextResponse.json(
    { items: [] },
    {
      status: 501,
      headers: { "Cache-Control": "no-store" },
    }
  );
}
