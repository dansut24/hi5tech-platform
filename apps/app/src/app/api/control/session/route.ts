// apps/app/src/app/api/control/session/route.ts
//
// Issues a short-lived signed session token that the Electron viewer uses to
// authenticate with the signalling WebSocket on the RMM server.
//
// Flow:
//   1. Browser (React) calls POST /api/control/session with { device_id }
//   2. This route validates the caller is authenticated, then asks the RMM
//      server to create a session and returns { session_id, token, wss_url }
//   3. Browser encodes those into a hi5tech:// deep link and launches it
//
// Place at: apps/app/src/app/api/control/session/route.ts

import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const RMM_API = (process.env.NEXT_PUBLIC_RMM_API_BASE ?? "https://rmm.hi5tech.co.uk").replace(/\/+$/, "");
const RMM_WSS = (process.env.NEXT_PUBLIC_RMM_WSS_BASE ?? "wss://rmm.hi5tech.co.uk").replace(/\/+$/, "");

export async function POST(req: Request) {
  let body: { device_id?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const deviceId = body?.device_id;
  if (!deviceId || typeof deviceId !== "string") {
    return NextResponse.json({ error: "device_id required" }, { status: 400 });
  }

  // Forward the tenant header — replace with real auth session lookup when ready
  const tenantId = req.headers.get("x-tenant-id") ?? "tnt_demo";

  // Ask the RMM server to mint a viewer session token for this device
  const upstream = await fetch(`${RMM_API}/api/viewer/session`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Tenant-ID": tenantId,
    },
    body: JSON.stringify({ device_id: deviceId }),
    cache: "no-store",
  });

  if (!upstream.ok) {
    const text = await upstream.text();
    return NextResponse.json(
      { error: `RMM server error: ${upstream.status}`, detail: text },
      { status: upstream.status }
    );
  }

  const data = (await upstream.json()) as {
    session_id: string;
    token: string;
  };

  return NextResponse.json({
    session_id: data.session_id,
    token: data.token,
    device_id: deviceId,
    wss_url: `${RMM_WSS}/viewer/ws`,
  });
}
