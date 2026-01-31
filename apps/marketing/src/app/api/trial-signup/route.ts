import { NextResponse } from "next/server";

type Payload = {
  companyName?: string;
  subdomain?: string;
  email?: string;
};

function jsonError(message: string, status = 400) {
  return NextResponse.json({ ok: false, error: message }, { status });
}

export async function POST(req: Request) {
  let body: Payload | null = null;
  try {
    body = (await req.json()) as Payload;
  } catch {
    return jsonError("Invalid JSON body.");
  }

  const companyName = (body?.companyName ?? "").trim();
  const subdomain = (body?.subdomain ?? "").trim().toLowerCase();
  const email = (body?.email ?? "").trim().toLowerCase();

  if (!companyName) return jsonError("Company name is required.");
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return jsonError("Valid email is required.");
  if (!subdomain || !/^[a-z0-9][a-z0-9-]{1,61}[a-z0-9]$/.test(subdomain)) {
    return jsonError("Subdomain must be 3-63 chars: a-z, 0-9, hyphen (no leading/trailing hyphen).");
  }

  // Optional: if you wire Supabase, we can store leads + later provision tenants automatically.
  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY) {
    try {
      const res = await fetch(`${SUPABASE_URL}/rest/v1/trial_signups`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: SUPABASE_SERVICE_ROLE_KEY,
          Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
          Prefer: "return=representation",
        },
        body: JSON.stringify({
          company_name: companyName,
          desired_subdomain: subdomain,
          admin_email: email,
          source: "marketing",
        }),
      });

      if (!res.ok) {
        const txt = await res.text();
        return NextResponse.json(
          { ok: false, error: "Failed to store signup.", details: txt },
          { status: 500 }
        );
      }

      const data = await res.json();
      return NextResponse.json({ ok: true, stored: true, data });
    } catch (e: any) {
      return NextResponse.json(
        { ok: false, error: "Server error storing signup.", details: String(e?.message ?? e) },
        { status: 500 }
      );
    }
  }

  // Fallback: accept the request but indicate we did not persist it.
  return NextResponse.json({
    ok: true,
    stored: false,
    message:
      "Signup received. To persist/provision, set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY and create trial_signups table.",
  });
}
