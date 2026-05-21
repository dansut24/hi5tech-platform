import { NextResponse } from "next/server";
import { RMM_API_BASE, controlServerHeaders } from "@/lib/control-server";

export const dynamic = "force-dynamic";

function passthroughHeaders(): HeadersInit {
  return controlServerHeaders({
    "X-Hi5-User": "portal",
  });
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const qs = url.searchParams.toString();
  const target = `${RMM_API_BASE}/api/actions${qs ? `?${qs}` : ""}`;

  const res = await fetch(target, {
    method: "GET",
    headers: passthroughHeaders(),
    cache: "no-store",
  });

  const body = await res.text();
  return new NextResponse(body, {
    status: res.status,
    headers: {
      "Content-Type": res.headers.get("Content-Type") || "application/json",
      "Cache-Control": "no-store",
    },
  });
}

export async function POST(req: Request) {
  const body = await req.text();
  const res = await fetch(`${RMM_API_BASE}/api/actions`, {
    method: "POST",
    headers: passthroughHeaders(),
    body,
    cache: "no-store",
  });

  const out = await res.text();
  return new NextResponse(out, {
    status: res.status,
    headers: {
      "Content-Type": res.headers.get("Content-Type") || "application/json",
      "Cache-Control": "no-store",
    },
  });
}
