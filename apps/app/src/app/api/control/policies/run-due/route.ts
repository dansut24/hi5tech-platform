import { NextResponse } from "next/server";
import { RMM_API_BASE, controlServerHeaders } from "@/lib/control-server";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const url = new URL(req.url);
  const qs = url.searchParams.toString();
  const target = `${RMM_API_BASE}/api/policies/run-due${qs ? `?${qs}` : ""}`;

  const res = await fetch(target, {
    method: "POST",
    headers: controlServerHeaders({ Accept: "application/json" }),
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
