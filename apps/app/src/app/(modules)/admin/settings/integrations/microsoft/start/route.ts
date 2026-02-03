import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST() {
  // Stub for now.
  // Next step: generate the Microsoft OAuth URL with tenant consent and return it.
  return NextResponse.json(
    {
      ok: false,
      error: "Microsoft connect is wired as a stub. Next: implement OAuth + admin consent + Graph.",
    },
    { status: 501 }
  );
}
