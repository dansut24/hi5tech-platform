import { NextRequest, NextResponse } from "next/server";

const RMM_API_BASE =
  process.env.NEXT_PUBLIC_RMM_API_BASE?.replace(/\/+$/, "") ||
  "https://rmm.hi5tech.co.uk";

export async function DELETE(
  _req: NextRequest,
  context: { params: Promise<{ deviceId: string }> }
) {
  const { deviceId } = await context.params;

  if (!deviceId) {
    return NextResponse.json({ error: "Missing deviceId" }, { status: 400 });
  }

  const res = await fetch(
    `${RMM_API_BASE}/api/devices/${encodeURIComponent(deviceId)}`,
    {
      method: "DELETE",
      cache: "no-store",
    }
  );

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    return NextResponse.json(
      { error: "Failed to delete device", details: text },
      { status: res.status }
    );
  }

  return NextResponse.json({ ok: true });
}
