import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { getMemberTenantIds } from "@/lib/tenant";
import { RMM_API_BASE, controlServerHeaders } from "@/lib/control-server";

export const dynamic = "force-dynamic";

type ProbeResult = {
  ok: boolean;
  url: string;
  status?: number;
  appToControlMs: number;
  error?: string;
  body?: unknown;
};

async function requireUser() {
  const supabase = await supabaseServer();
  const { data: userRes } = await supabase.auth.getUser();
  const user = userRes?.user;

  if (!user) return false;

  const memberTenantIds = await getMemberTenantIds();
  return memberTenantIds.length > 0;
}

function appRuntimeStats() {
  const mem = process.memoryUsage();
  return {
    generatedAt: new Date().toISOString(),
    nodeVersion: process.version,
    platform: process.platform,
    arch: process.arch,
    uptimeSec: process.uptime(),
    memory: {
      rssBytes: mem.rss,
      heapTotalBytes: mem.heapTotal,
      heapUsedBytes: mem.heapUsed,
      externalBytes: mem.external,
      arrayBuffersBytes: mem.arrayBuffers,
    },
    rmmApiBase: RMM_API_BASE,
    deployment: {
      vercel: process.env.VERCEL === "1",
      region: process.env.VERCEL_REGION ?? null,
      environment: process.env.VERCEL_ENV ?? null,
      commit: process.env.VERCEL_GIT_COMMIT_SHA ?? null,
    },
  };
}

async function probeControlServer(path: string): Promise<ProbeResult> {
  const url = `${RMM_API_BASE}${path}`;
  const start = performance.now();

  try {
    const res = await fetch(url, {
      cache: "no-store",
      headers: controlServerHeaders({ Accept: "application/json" }),
      signal: AbortSignal.timeout(6000),
    });

    const body = await res.json().catch(() => null);

    return {
      ok: res.ok,
      url,
      status: res.status,
      appToControlMs: Math.round((performance.now() - start) * 10) / 10,
      body,
      error: res.ok ? undefined : (body as any)?.error || `HTTP ${res.status}`,
    };
  } catch (err) {
    return {
      ok: false,
      url,
      appToControlMs: Math.round((performance.now() - start) * 10) / 10,
      error: err instanceof Error ? err.message : "Failed to reach control server",
    };
  }
}

export async function GET(_req: NextRequest) {
  const ok = await requireUser();

  if (!ok) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const started = performance.now();
  const controlProbe = await probeControlServer("/api/diagnostics");

  return NextResponse.json(
    {
      ok: controlProbe.ok,
      generatedAt: new Date().toISOString(),
      totalMs: Math.round((performance.now() - started) * 10) / 10,
      app: appRuntimeStats(),
      control: controlProbe,
    },
    { headers: { "Cache-Control": "no-store" } }
  );
}
