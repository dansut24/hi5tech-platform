import { NextResponse } from "next/server";
import { RMM_API_BASE, controlServerHeaders } from "@/lib/control-server";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const qs = url.searchParams.toString();
  const res = await fetch(`${RMM_API_BASE}/api/actions${qs ? `?${qs}` : ""}`, {
    method: "GET",
    headers: controlServerHeaders(),
    cache: "no-store",
  });

  const data = await res.json().catch(() => ({}));
  const actions = Array.isArray(data?.actions) ? data.actions : [];

  const jobs = actions.map((a: any) => ({
    id: a.action_id,
    created_at: a.created_at,
    updated_at: a.updated_at,
    status: a.status,
    progress: a.progress ?? 0,
    kind: a.action_type === "run_powershell" ? "command" : a.action_type,
    command: a.payload_json?.command ?? a.payload?.command ?? a.action_type,
    message: a.message ?? "",
    error_message: a.error_message ?? "",
    result: a.result_json ?? {},
    targets: [{ device_id: a.device_id }],
  }));

  return NextResponse.json({ jobs, actions }, { status: res.status, headers: { "Cache-Control": "no-store" } });
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));

  const res = await fetch(`${RMM_API_BASE}/api/actions`, {
    method: "POST",
    headers: controlServerHeaders({ "X-Hi5-User": "portal" }),
    body: JSON.stringify(body),
    cache: "no-store",
  });

  const data = await res.json().catch(() => ({}));
  return NextResponse.json(data, { status: res.status, headers: { "Cache-Control": "no-store" } });
}
