import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import {
  getTenantEnvironmentHost,
  resolveTenantEnvironment,
} from "@/lib/tenant/environment-host";

export const dynamic = "force-dynamic";

function json(status: number, body: any) {
  return NextResponse.json(body, {
    status,
    headers: {
      "cache-control": "no-store",
    },
  });
}

function cleanEmail(value: unknown) {
  return String(value ?? "").trim().toLowerCase();
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null);
    const email = cleanEmail(body?.email);

    if (!email || !email.includes("@")) {
      return json(400, {
        allowed: false,
        error: "A valid email address is required.",
      });
    }

    const hostInfo = await getTenantEnvironmentHost();

    /*
      app.hi5tech.co.uk is the central app/login host.
      Allow password login here; tenant membership can be resolved after sign-in.
    */
    if (hostInfo.isAppHost) {
      return json(200, {
        allowed: true,
        mode: "app",
      });
    }

    /*
      Platform admin login is guarded separately by /admin-console.
      For testing mode, allow signed-in accounts to attempt login.
    */
    if (hostInfo.isPlatformAdminHost) {
      return json(200, {
        allowed: true,
        mode: "platform-admin",
      });
    }

    const resolved = await resolveTenantEnvironment();

    if (!resolved?.tenantId) {
      return json(404, {
        allowed: false,
        error: "Workspace not found.",
      });
    }

    const supabase = await supabaseServer();

    const { data: profile } = await supabase
      .from("profiles")
      .select("id")
      .eq("email", email)
      .maybeSingle();

    if (!profile?.id) {
      return json(200, {
        allowed: false,
        error: "That email isn't authorised for this tenant.",
      });
    }

    const { data: membership } = await supabase
      .from("memberships")
      .select("id, role")
      .eq("tenant_id", resolved.tenantId)
      .eq("user_id", profile.id)
      .maybeSingle();

    if (!membership?.id) {
      return json(200, {
        allowed: false,
        error: "That email isn't authorised for this tenant.",
      });
    }

    return json(200, {
      allowed: true,
      tenantId: resolved.tenantId,
      tenantSubdomain: resolved.tenantSubdomain,
      environmentKey: resolved.environmentKey,
      role: membership.role,
    });
  } catch (err) {
    return json(500, {
      allowed: false,
      error: err instanceof Error ? err.message : "Auth check failed.",
    });
  }
}
