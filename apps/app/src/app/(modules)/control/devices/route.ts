import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const UPSTREAM = "https://rmm.hi5tech.co.uk/api/devices";

export async function GET(req: Request) {
  // Forward tenant (temporary: header; later: your real auth/session)
  const tenantId = req.headers.get("x-tenant-id") ?? "tnt_demo";

  const res = await fetch(UPSTREAM, {
    method: "GET",
    headers: {
      Accept: "application/json",
      "X-Tenant-ID": tenantId,
    },
    cache: "no-store",
  });

  const text = await res.text();

  return new NextResponse(text, {
    status: res.status,
    headers: {
      "Content-Type": res.headers.get("content-type") ?? "application/json",
      "Cache-Control": "no-store",
    },
  });
}
