import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { normalizeSubdomain, ROOT_DOMAIN } from "@/lib/onboarding/create-tenant-workspace";
import { isReservedTenantSubdomain } from "@/lib/tenant/environment-host";

export const dynamic = "force-dynamic";

const APP_URL = (process.env.NEXT_PUBLIC_APP_URL || "https://app.hi5tech.co.uk").replace(/\/+$/, "");
const SIGNUP_PROXY_SECRET = process.env.SIGNUP_PROXY_SECRET || "";

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

function tenantBaseUrl(subdomain: string) {
  return `https://${subdomain}.${ROOT_DOMAIN}`;
}

export async function GET() {
  return json(200, {
    ok: true,
    route: "platform-signup-start",
    appUrl: APP_URL,
    rootDomain: ROOT_DOMAIN,
    hasSignupProxySecret: Boolean(SIGNUP_PROXY_SECRET),
    hasSupabaseUrl: Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL),
    hasSupabaseAnonKey: Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
  });
}

export async function POST(req: Request) {
  try {
    if (SIGNUP_PROXY_SECRET) {
      const provided = req.headers.get("x-hi5-signup-proxy-secret") || "";

      if (provided !== SIGNUP_PROXY_SECRET) {
        return json(401, { error: "Unauthorized" });
      }
    }

    const body = await req.json().catch(() => null);

    const companyName = String(body?.companyName ?? "").trim();
    const subdomain = normalizeSubdomain(String(body?.subdomain ?? ""));
    const adminName = String(body?.adminName ?? "").trim();
    const adminEmail = cleanEmail(body?.adminEmail);
    const password = String(body?.password ?? "");

    if (!companyName || companyName.length < 2) {
      return json(400, { error: "Company name is required" });
    }

    if (!subdomain || subdomain.length < 3) {
      return json(400, { error: "Workspace URL must be at least 3 characters" });
    }

    if (isReservedTenantSubdomain(subdomain)) {
      return json(400, {
        error: "That workspace URL is reserved. Please choose a different workspace name.",
      });
    }

    if (!adminName || adminName.length < 2) {
      return json(400, { error: "Your name is required" });
    }

    if (!adminEmail || !adminEmail.includes("@")) {
      return json(400, { error: "A valid email address is required" });
    }

    if (!password || password.length < 8) {
      return json(400, { error: "Password must be at least 8 characters" });
    }

    const admin = supabaseAdmin();

    const { data: existingTenant } = await admin
      .from("tenants")
      .select("id")
      .eq("domain", ROOT_DOMAIN)
      .eq("subdomain", subdomain)
      .maybeSingle();

    if (existingTenant?.id) {
      return json(409, { error: "That workspace URL is already taken" });
    }

    const { data: existingIntent } = await admin
      .from("tenant_signup_intents")
      .select("id, status, expires_at")
      .eq("root_domain", ROOT_DOMAIN)
      .eq("subdomain", subdomain)
      .in("status", ["pending_email", "confirmed"])
      .maybeSingle();

    if (existingIntent?.id) {
      return json(409, { error: "That workspace URL is already reserved" });
    }

    const { data: intent, error: intentError } = await admin
      .from("tenant_signup_intents")
      .insert({
        company_name: companyName,
        subdomain,
        root_domain: ROOT_DOMAIN,
        admin_name: adminName,
        admin_email: adminEmail,
        status: "pending_email",
        expires_at: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(),
      })
      .select("id")
      .single();

    if (intentError || !intent?.id) {
      return json(400, {
        error: intentError?.message || "Failed to reserve workspace",
      });
    }

    const supabaseAuth = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
      }
    );

    const workspaceUrl = tenantBaseUrl(subdomain);
    const emailRedirectTo = `${workspaceUrl}/auth/confirm`;

    const { data: signUpData, error: signUpError } = await supabaseAuth.auth.signUp({
      email: adminEmail,
      password,
      options: {
        emailRedirectTo,
        data: {
          full_name: adminName,
          signup_intent_id: intent.id,
          company_name: companyName,
          workspace_subdomain: subdomain,
          workspace_url: workspaceUrl,
          workspace_test_url: `https://test-${subdomain}.${ROOT_DOMAIN}`,
          workspace_staging_url: `https://stg-${subdomain}.${ROOT_DOMAIN}`,
          root_domain: ROOT_DOMAIN,
        },
      },
    });

    if (signUpError) {
      await admin
        .from("tenant_signup_intents")
        .update({ status: "cancelled" })
        .eq("id", intent.id);

      return json(400, { error: signUpError.message });
    }

    if (signUpData.user?.id) {
      await admin
        .from("tenant_signup_intents")
        .update({ auth_user_id: signUpData.user.id })
        .eq("id", intent.id);
    }

    return json(200, {
      ok: true,
      message: "Check your email to confirm your account.",
      workspace: `${subdomain}.${ROOT_DOMAIN}`,
      environmentUrls: {
        production: workspaceUrl,
        test: `https://test-${subdomain}.${ROOT_DOMAIN}`,
        staging: `https://stg-${subdomain}.${ROOT_DOMAIN}`,
      },
      emailRedirectTo,
    });
  } catch (err) {
    return json(500, {
      error: err instanceof Error ? err.message : "Signup failed",
    });
  }
}
