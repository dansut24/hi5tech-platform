import { NextResponse } from "next/server";
import crypto from "node:crypto";
import { headers } from "next/headers";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { getEffectiveHost, parseTenantHost } from "@/lib/tenant/tenant-from-host";

export const dynamic = "force-dynamic";

const DEFAULT_RMM_API_BASE_URL = "https://rmm.hi5tech.co.uk";
const DEFAULT_AGENT_WS_BASE_URL = "wss://rmm.hi5tech.co.uk/agent/ws";

type TenantContext = {
  supabase: Awaited<ReturnType<typeof supabaseServer>>;
  me: { id: string; email?: string | null } | null;
  tenant: {
    id: string;
    domain: string | null;
    subdomain: string | null;
    name: string | null;
    company_name?: string | null;
  } | null;
};

function sha256(input: string) {
  return crypto.createHash("sha256").update(input).digest("hex");
}

function safeString(value: unknown, fallback = "") {
  const text = String(value ?? "").trim();
  return text || fallback;
}

function trimRightSlash(value: string) {
  return value.trim().replace(/\/+$/, "");
}

async function getContext(): Promise<TenantContext> {
  const supabase = await supabaseServer();

  const { data: userRes } = await supabase.auth.getUser();
  const user = userRes.user;

  if (!user) {
    return { supabase, me: null, tenant: null };
  }

  const me = { id: user.id, email: user.email };

  const host = getEffectiveHost(await headers());
  const parsed = parseTenantHost(host);

  if (parsed.subdomain) {
    const { data: tenant } = await supabase
      .from("tenants")
      .select("id, domain, subdomain, name, company_name")
      .eq("domain", parsed.rootDomain)
      .eq("subdomain", parsed.subdomain)
      .maybeSingle();

    if (tenant) {
      return { supabase, me, tenant };
    }
  }

  const { data: membership } = await supabase
    .from("memberships")
    .select("tenant_id")
    .eq("user_id", me.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!membership?.tenant_id) {
    return { supabase, me, tenant: null };
  }

  const { data: tenant } = await supabase
    .from("tenants")
    .select("id, domain, subdomain, name, company_name")
    .eq("id", membership.tenant_id)
    .maybeSingle();

  return { supabase, me, tenant: tenant ?? null };
}

async function dispatchGitHubWorkflow(input: {
  packageId: string;
  requestPath: string;
  callbackUrl: string;
}) {
  const owner = process.env.GITHUB_OWNER;
  const repo = process.env.GITHUB_REPO;
  const workflowId = process.env.GITHUB_WORKFLOW_ID || "build-provisioned-agent.yml";
  const ref = process.env.GITHUB_REF || "main";
  const token = process.env.GITHUB_ACTIONS_TOKEN;

  if (!owner) throw new Error("Missing env: GITHUB_OWNER");
  if (!repo) throw new Error("Missing env: GITHUB_REPO");
  if (!token) throw new Error("Missing env: GITHUB_ACTIONS_TOKEN");

  const res = await fetch(
    `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/actions/workflows/${encodeURIComponent(workflowId)}/dispatches`,
    {
      method: "POST",
      headers: {
        Accept: "application/vnd.github+json",
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        "X-GitHub-Api-Version": "2022-11-28",
      },
      body: JSON.stringify({
        ref,
        inputs: {
          package_id: input.packageId,
          request_path: input.requestPath,
          callback_url: input.callbackUrl,
        },
      }),
    }
  );

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`GitHub workflow dispatch failed: HTTP ${res.status} ${text}`);
  }
}

export async function POST(req: Request) {
  const { supabase, me, tenant } = await getContext();

  if (!me || !tenant) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);

  const packageId = safeString(body?.package_id);
  const bootstrapSecret = safeString(body?.bootstrap_secret);
  const apiBaseUrl = trimRightSlash(safeString(body?.api_base_url, DEFAULT_RMM_API_BASE_URL));
  const agentWsBaseUrl = trimRightSlash(safeString(body?.agent_ws_base_url, DEFAULT_AGENT_WS_BASE_URL));

  if (!packageId) {
    return NextResponse.json({ error: "package_id required" }, { status: 400 });
  }

  if (!bootstrapSecret) {
    return NextResponse.json(
      {
        error:
          "bootstrap_secret required. Provisioned EXE builds can only be started while the one-time package secret is still available. Generate a new package if needed.",
      },
      { status: 400 }
    );
  }

  const admin = supabaseAdmin();

  const { data: pkg, error: pkgError } = await admin
    .from("enrollment_packages")
    .select(
      "id, tenant_id, group_id, name, status, secret_hash, package_type, install_source, installer_status, installer_file_path, installer_filename, created_at"
    )
    .eq("id", packageId)
    .eq("tenant_id", tenant.id)
    .maybeSingle();

  if (pkgError) {
    return NextResponse.json({ error: pkgError.message }, { status: 500 });
  }

  if (!pkg) {
    return NextResponse.json({ error: "Package not found" }, { status: 404 });
  }

  if (pkg.status !== "active") {
    return NextResponse.json({ error: "Package is revoked" }, { status: 410 });
  }

  if (pkg.secret_hash !== sha256(bootstrapSecret)) {
    return NextResponse.json({ error: "Invalid package secret" }, { status: 403 });
  }

  let groupName = "Default";

  if (pkg.group_id && pkg.group_id !== "default") {
    const { data: group } = await admin
      .from("device_groups")
      .select("name")
      .eq("tenant_id", tenant.id)
      .eq("id", pkg.group_id)
      .maybeSingle();

    if (group?.name) {
      groupName = group.name;
    }
  }

  const now = new Date().toISOString();
  const requestPath = `${tenant.id}/${pkg.id}/provisioning-request.json`;
  const enrollmentToken = `${pkg.id}.${bootstrapSecret}`;

  const requestPayload = {
    tenant_slug: tenant.subdomain || tenant.company_name || tenant.name || "tenant",
    tenant_id: tenant.id,
    group_id: pkg.group_id || "default",
    group_name: groupName,
    package_id: pkg.id,
    package_name: pkg.name,
    enrollment_token: enrollmentToken,
    api_base_url: apiBaseUrl,
    agent_ws_base_url: agentWsBaseUrl,
    install_source: "github-provisioned-exe",
    requested_by: me.id,
    requested_at: now,
  };

  const upload = await admin.storage
    .from("agent-installer-requests")
    .upload(requestPath, Buffer.from(JSON.stringify(requestPayload, null, 2), "utf8"), {
      contentType: "application/json",
      upsert: true,
    });

  if (upload.error) {
    return NextResponse.json({ error: upload.error.message }, { status: 500 });
  }

  const callbackUrl = new URL(
    "/api/admin/enrollment-packages/build-installer/callback",
    req.url
  ).toString();

  const { data: updatedPackage, error: updateError } = await admin
    .from("enrollment_packages")
    .update({
      installer_status: "building",
      installer_requested_at: now,
      installer_error: null,
      installer_file_path: null,
      installer_filename: null,
      installer_generated_at: null,
    })
    .eq("id", pkg.id)
    .eq("tenant_id", tenant.id)
    .select(
      "id, tenant_id, group_id, policy_id, name, status, secret_hint, package_type, install_source, created_at, revoked_at, last_synced_at, installer_status, installer_file_path, installer_filename, installer_requested_at, installer_generated_at, installer_error"
    )
    .single();

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  try {
    await dispatchGitHubWorkflow({
      packageId: pkg.id,
      requestPath,
      callbackUrl,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to dispatch GitHub workflow";

    await admin
      .from("enrollment_packages")
      .update({
        installer_status: "failed",
        installer_error: message,
      })
      .eq("id", pkg.id)
      .eq("tenant_id", tenant.id);

    return NextResponse.json({ error: message }, { status: 502 });
  }

  return NextResponse.json({
    ok: true,
    package: updatedPackage,
    request_path: requestPath,
  });
}
