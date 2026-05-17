import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
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

    if (hostInfo.isAppHost) {
      return json(200, {
        allowed: true,
        mode: "app",
      });
    }

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

    const admin = supabaseAdmin();

    const { data: signupIntent } = await admin
      .from("tenant_signup_intents")
      .select("id, status, created_tenant_id, admin_email, subdomain")
      .eq("admin_email", email)
      .eq("subdomain", resolved.tenantSubdomain)
      .in("status", ["pending_email", "confirmed", "completed"])
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (signupIntent?.id) {
      return json(200, {
        allowed: true,
        mode: "signup-owner",
        tenantId: resolved.tenantId,
        tenantSubdomain: resolved.tenantSubdomain,
        environmentKey: resolved.environmentKey,
      });
    }

    const { data: profile } = await admin
      .from("profiles")
      .select("id, email")
      .eq("email", email)
      .maybeSingle();

    if (profile?.id) {
      const { data: membership } = await admin
        .from("memberships")
        .select("id, role")
        .eq("tenant_id", resolved.tenantId)
        .eq("user_id", profile.id)
        .maybeSingle();

      if (membership?.id) {
        return json(200, {
          allowed: true,
          mode: "tenant-member",
          tenantId: resolved.tenantId,
          tenantSubdomain: resolved.tenantSubdomain,
          environmentKey: resolved.environmentKey,
          role: membership.role,
        });
      }

      return json(200, {
        allowed: false,
        error: "That email isn't authorised for this tenant.",
      });
    }

    return json(200, {
      allowed: true,
      mode: "defer-until-after-login",
      tenantId: resolved.tenantId,
      tenantSubdomain: resolved.tenantSubdomain,
      environmentKey: resolved.environmentKey,
    });
  } catch (err) {
    return json(500, {
      allowed: false,
      error: err instanceof Error ? err.message : "Auth check failed.",
    });
  }
}
