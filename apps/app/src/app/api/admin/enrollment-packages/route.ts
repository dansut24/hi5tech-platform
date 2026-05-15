import { NextResponse } from "next/server";
import crypto from "node:crypto";
import { headers } from "next/headers";
import { supabaseServer } from "@/lib/supabase/server";
import { getEffectiveHost, parseTenantHost } from "@/lib/tenant/tenant-from-host";
import { controlServerJson } from "@/lib/control-server";

export const dynamic = "force-dynamic";

type TenantContext = {
  supabase: Awaited<ReturnType<typeof supabaseServer>>;
  me: { id: string } | null;
  tenant: { id: string; domain: string | null; subdomain: string | null; name: string | null } | null;
};

async function getContext(): Promise<TenantContext> {
  const supabase = await supabaseServer();

  const { data: userRes } = await supabase.auth.getUser();
  const me = userRes.user ? { id: userRes.user.id } : null;
  if (!me) return { supabase, me: null, tenant: null };

  const host = getEffectiveHost(await headers());
  const parsed = parseTenantHost(host);

  if (parsed.subdomain) {
    const { data: tenant } = await supabase
      .from("tenants")
      .select("id, domain, subdomain, name")
      .eq("domain", parsed.rootDomain)
      .eq("subdomain", parsed.subdomain)
      .maybeSingle();

    if (tenant) return { supabase, me, tenant };
  }

  const { data: membership } = await supabase
    .from("memberships")
    .select("tenant_id")
    .eq("user_id", me.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!membership?.tenant_id) return { supabase, me, tenant: null };

  const { data: tenant } = await supabase
    .from("tenants")
    .select("id, domain, subdomain, name")
    .eq("id", membership.tenant_id)
    .maybeSingle();

  return { supabase, me, tenant: tenant ?? null };
}

function sha256(input: string) {
  return crypto.createHash("sha256").update(input).digest("hex");
}

async function assertGroupBelongsToTenant(
  supabase: Awaited<ReturnType<typeof supabaseServer>>,
  tenantId: string,
  groupId: string | null
) {
  if (!groupId || groupId === "default") return;

  const { data, error } = await supabase
    .from("device_groups")
    .select("id")
    .eq("tenant_id", tenantId)
    .eq("id", groupId)
    .is("archived_at", null)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) throw new Error("Selected group was not found for this tenant");
}

const PACKAGE_SELECT =
  "id, tenant_id, group_id, policy_id, name, status, secret_hint, package_type, install_source, created_at, revoked_at, last_synced_at, installer_status, installer_file_path, installer_filename, installer_requested_at, installer_generated_at, installer_error";

export async function GET() {
  const { supabase, me, tenant } = await getContext();

  if (!me || !tenant) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data, error } = await supabase
    .from("enrollment_packages")
    .select(PACKAGE_SELECT)
    .eq("tenant_id", tenant.id)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ packages: data ?? [], tenant });
}

export async function POST(req: Request) {
  const { supabase, me, tenant } = await getContext();

  if (!me || !tenant) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const name = String(body?.name ?? "").trim();
  const group_id = body?.group_id ? String(body.group_id) : "default";
  const policy_id = body?.policy_id ? String(body.policy_id) : null;
  const package_type = body?.package_type ? String(body.package_type) : "windows-x64";
  const install_source = body?.install_source ? String(body.install_source) : "rmm-portal";

  if (!name) {
    return NextResponse.json({ error: "name required" }, { status: 400 });
  }

  try {
    await assertGroupBelongsToTenant(supabase, tenant.id, group_id);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Invalid group" },
      { status: 400 }
    );
  }

  const secret = crypto.randomBytes(32).toString("base64url");
  const secretHash = sha256(secret);
  const secretHint = `${secret.slice(0, 4)}…${secret.slice(-4)}`;

  const { data, error } = await supabase
    .from("enrollment_packages")
    .insert({
      tenant_id: tenant.id,
      name,
      group_id,
      policy_id,
      package_type,
      install_source,
      secret_hash: secretHash,
      secret_hint: secretHint,
      created_by: me.id,
      status: "active",
      installer_status: "not_requested",
    })
    .select(PACKAGE_SELECT)
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  let syncWarning: string | null = null;

  try {
    await controlServerJson("/api/enrollment-packages/sync", {
      method: "POST",
      body: JSON.stringify({
        id: data.id,
        tenant_id: tenant.id,
        group_id,
        name,
        secret_hash: secretHash,
        status: "active",
        package_type,
        install_source,
      }),
    });

    await supabase
      .from("enrollment_packages")
      .update({ last_synced_at: new Date().toISOString() })
      .eq("id", data.id)
      .eq("tenant_id", tenant.id);
  } catch (err) {
    syncWarning = err instanceof Error ? err.message : "Failed to sync package to control server";
  }

  return NextResponse.json({
    package: data,
    bootstrap_secret: secret,
    sync_warning: syncWarning,
  });
}
