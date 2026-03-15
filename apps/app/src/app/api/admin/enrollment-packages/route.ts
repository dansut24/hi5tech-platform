import { NextResponse } from "next/server";
import crypto from "node:crypto";
import { supabaseServer } from "@/lib/supabase/server";
import { headers } from "next/headers";
import { getEffectiveHost, parseTenantHost } from "@/lib/tenant/tenant-from-host";

export const dynamic = "force-dynamic";

async function getContext() {
  const supabase = await supabaseServer();

  const { data: userRes } = await supabase.auth.getUser();
  const me = userRes.user;
  if (!me) return { supabase, me: null, tenant: null };

  const host = getEffectiveHost(await headers());
  const parsed = parseTenantHost(host);
  if (!parsed.subdomain) return { supabase, me, tenant: null };

  const { data: tenant } = await supabase
    .from("tenants")
    .select("id, domain, subdomain, name")
    .eq("domain", parsed.rootDomain)
    .eq("subdomain", parsed.subdomain)
    .maybeSingle();

  return { supabase, me, tenant };
}

export async function GET() {
  const { supabase, me, tenant } = await getContext();
  if (!me || !tenant) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data, error } = await supabase
    .from("enrollment_packages")
    .select("id, tenant_id, group_id, policy_id, name, status, secret_hint, created_at")
    .eq("tenant_id", tenant.id)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ packages: data ?? [] });
}

export async function POST(req: Request) {
  const { supabase, me, tenant } = await getContext();
  if (!me || !tenant) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const name = String(body?.name ?? "").trim();
  const group_id = body?.group_id ? String(body.group_id) : null;
  const policy_id = body?.policy_id ? String(body.policy_id) : null;

  if (!name) {
    return NextResponse.json({ error: "name required" }, { status: 400 });
  }

  const secret = crypto.randomBytes(24).toString("base64url");
  const secretHash = crypto.createHash("sha256").update(secret).digest("hex");
  const secretHint = `${secret.slice(0, 4)}…${secret.slice(-4)}`;

  const { data, error } = await supabase
    .from("enrollment_packages")
    .insert({
      tenant_id: tenant.id,
      name,
      group_id,
      policy_id,
      secret_hash: secretHash,
      secret_hint: secretHint,
      created_by: me.id,
      status: "active",
    })
    .select("id, tenant_id, group_id, policy_id, name, status, secret_hint, created_at")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    package: data,
    bootstrap_secret: secret,
  });
}
