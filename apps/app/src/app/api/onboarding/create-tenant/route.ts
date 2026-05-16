import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

function json(status: number, body: any) {
  return NextResponse.json(body, {
    status,
    headers: {
      "cache-control": "no-store",
    },
  });
}

export async function GET() {
  return json(410, {
    error: "This onboarding endpoint has been replaced.",
    replacedBy: {
      signup: "/api/signup/start",
      setup: "/api/setup/complete",
    },
  });
}

export async function POST() {
  return json(410, {
    error:
      "This onboarding endpoint has been replaced. Use /api/signup/start first, then /api/setup/complete after email confirmation.",
    replacedBy: {
      signup: "/api/signup/start",
      setup: "/api/setup/complete",
    },
  });
}
