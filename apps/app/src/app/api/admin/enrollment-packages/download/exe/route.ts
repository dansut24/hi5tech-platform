import { NextResponse } from "next/server";
import path from "node:path";
import fs from "node:fs/promises";
import { headers } from "next/headers";
import { supabaseServer } from "@/lib/supabase/server";
import { getEffectiveHost, parseTenantHost } from "@/lib/tenant/tenant-from-host";

export const dynamic = "force-dynamic";

type TenantContext = {
  supabase: Awaited<ReturnType<typeof supabaseServer>>;
  me: { id: string } | null;
  tenant: {
    id: string;
    domain: string | null;
    subdomain: string | null;
    name: string | null;
    company_name?: string | null;
  } | null;
};

function safeFilePart(value: string) {
  return (
    value
      .trim()
      .replace(/[^a-z0-9_-]+/gi, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 80) || "Tenant"
  );
}

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
      .select("id, domain, subdomain, name, company_name")
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
    .select("id, domain, subdomain, name, company_name")
    .eq("id", membership.tenant_id)
    .maybeSingle();

  return { supabase, me, tenant: tenant ?? null };
}

async function readInstaller() {
  const candidates = [
    path.join(process.cwd(), "public", "downloads", "Hi5TechAgentSetup.exe"),
    path.join(process.cwd(), "public", "downloads", "agent", "Hi5TechAgentSetup.exe"),
  ];

  for (const candidate of candidates) {
    try {
      const file = await fs.readFile(candidate);
      return { file, filePath: candidate };
    } catch {
      // Try next candidate.
    }
  }

  return null;
}

export async function GET(req: Request) {
  const { supabase, me, tenant } = await getContext();

  if (!me || !tenant) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(req.url);
  const id = url.searchParams.get("id");

  if (!id) {
    return NextResponse.json({ error: "id required" }, { status: 400 });
  }

  const { data: pkg, error: pkgError } = await supabase
    .from("enrollment_packages")
    .select("id, tenant_id, group_id, name, status, package_type")
    .eq("id", id)
    .eq("tenant_id", tenant.id)
    .maybeSingle();

  if (pkgError) {
    return NextResponse.json({ error: pkgError.message }, { status: 500 });
  }

  if (!pkg) {
    return NextResponse.json({ error: "Package not found" }, { status: 404 });
  }

  if (pkg.status !== "active") {
    return NextResponse.json({ error: "Package has been revoked" }, { status: 410 });
  }

  let groupName = "Default";

  if (pkg.group_id && pkg.group_id !== "default") {
    const { data: group } = await supabase
      .from("device_groups")
      .select("name")
      .eq("tenant_id", tenant.id)
      .eq("id", pkg.group_id)
      .maybeSingle();

    if (group?.name) {
      groupName = group.name;
    }
  }

  const installer = await readInstaller();

  if (!installer) {
    return NextResponse.json(
      {
        error:
          "Installer not found. Expected public/downloads/Hi5TechAgentSetup.exe or public/downloads/agent/Hi5TechAgentSetup.exe",
      },
      { status: 404 }
    );
  }

  const tenantName = tenant.subdomain || tenant.company_name || tenant.name || "Tenant";
  const fileName = `${safeFilePart(tenantName)}-${safeFilePart(groupName)}-Hi5TechAgentSetup.exe`;

  return new NextResponse(installer.file, {
    headers: {
      "Content-Type": "application/vnd.microsoft.portable-executable",
      "Content-Disposition": `attachment; filename="${fileName}"`,
      "Cache-Control": "no-store",
      "X-Hi5Tech-Package-Id": pkg.id,
      "X-Hi5Tech-Package-Type": pkg.package_type || "windows-x64",
      "X-Hi5Tech-Provisioned": "false",
      "X-Hi5Tech-Provisioning-Mode": "generic-named-installer",
    },
  });
}
