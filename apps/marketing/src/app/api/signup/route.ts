// apps/marketing/src/app/api/signup/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function reqEnv(name: string) {
  const v = process.env[name];
  if (!v) throw new Error(`${name} is required`);
  return v;
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const companyName = String(body.companyName ?? "").trim();
    const adminEmail = String(body.adminEmail ?? "").trim().toLowerCase();
    const subdomain = String(body.subdomain ?? "").trim().toLowerCase();

    if (!companyName || !adminEmail || !subdomain) {
      return NextResponse.json(
        { ok: false, error: "Missing companyName/adminEmail/subdomain" },
        { status: 400 }
      );
    }

    // ✅ Server-only env vars (NOT NEXT_PUBLIC)
    const supabaseUrl = reqEnv("SUPABASE_URL");
    const serviceKey = reqEnv("SUPABASE_SERVICE_ROLE_KEY");

    const supabase = createClient(supabaseUrl, serviceKey, {
      auth: { persistSession: false },
    });

    // 14-day trial
    const now = new Date();
    const trialEnds = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);

    // Insert tenant (adjust column names to match YOUR schema)
    const { data: tenant, error: tenantErr } = await supabase
      .from("tenants")
      .insert({
        name: companyName,
        subdomain,
        trial_ends_at: trialEnds.toISOString(),
        status: "trial",
      })
      .select("*")
      .single();

    if (tenantErr) {
      console.error("TENANT INSERT ERROR:", tenantErr);
      return NextResponse.json(
        { ok: false, error: tenantErr.message, details: tenantErr },
        { status: 500 }
      );
    }

    // OPTIONAL (skip email for now): you can still create an invite later
    // If you do invite, do it AFTER the insert, and don’t mask DB errors.

    return NextResponse.json({
      ok: true,
      tenant,
      message: "Tenant created",
    });
  } catch (e: any) {
    console.error("SIGNUP ROUTE ERROR:", e);
    return NextResponse.json(
      { ok: false, error: e?.message ?? "Unknown error" },
      { status: 500 }
    );
  }
}
