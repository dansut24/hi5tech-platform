// apps/app/src/app/api/control/session/route.ts
//
// Proxies to the Go server's POST /api/remote-sessions endpoint
// (handleAPIRemoteSessions in api.go) which already exists and returns:
//   { session_id, token, device_id, server, expires_at }
//
// The Electron viewer deep link uses:
//   hi5tech://connect?session_id=X&token=Y&wss_url=Z&device_id=W
//
// Place at: apps/app/src/app/api/control/session/route.ts

import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const RMM_API = (process.env.NEXT_PUBLIC_RMM_API_BASE ?? "https://rmm.hi5tech.co.uk").replace(/\/+$/, "");

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

  // Call the Go server's existing remote-sessions endpoint
  let upstream: Response;
  try {
    upstream = await fetch(`${RMM_API}/api/remote-sessions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ device_id: deviceId }),
      cache: "no-store",
    });
  } catch (e: any) {
    return NextResponse.json(
      { error: "Could not reach RMM server", detail: e?.message },
      { status: 502 }
    );
  }

  if (!upstream.ok) {
    const text = await upstream.text();
    return NextResponse.json(
      { error: `RMM server error: ${upstream.status}`, detail: text },
      { status: upstream.status }
    );
  }

  // Go server returns: { session_id, token, device_id, server, expires_at }
  const data = (await upstream.json()) as {
    session_id: string;
    token: string;
    device_id: string;
    server: string;
    expires_at: string;
  };

  // The "server" field from Go is the base URL (e.g. https://rmm.hi5tech.co.uk).
  // Build the wss_url the Electron viewer needs for its signalling WebSocket.
  // The Go server registers the viewer WS at /ws/viewer (NOT /viewer/ws).
  const serverBase = (data.server ?? RMM_API).replace(/\/+$/, "");
  const wssBase = serverBase.replace(/^https?:\/\//, (m) =>
    m.startsWith("https") ? "wss://" : "ws://"
  );

  return NextResponse.json({
    session_id: data.session_id,
    token:      data.token,
    device_id:  data.device_id,
    wss_url:    `${wssBase}/ws/viewer`,
    expires_at: data.expires_at,
  });
}
