import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

const ROOT_DOMAIN = process.env.NEXT_PUBLIC_ROOT_DOMAIN || "hi5tech.co.uk";

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

function getSubdomainFromHost(hostHeader: string | null) {
  const host = String(hostHeader || "")
    .toLowerCase()
    .split(":")[0]
    .trim();

  if (!host) return null;

  if (host === ROOT_DOMAIN || host === `www.${ROOT_DOMAIN}`) {
    return null;
  }

  if (host.endsWith(`.${ROOT_DOMAIN}`)) {
    const subdomain = host.slice(0, -1 * (`.${ROOT_DOMAIN}`.length));
    return subdomain || null;
  }

  return null;
}

function safeNext(value: unknown) {
  const next = String(value ?? "").trim();

  if (!next || !next.startsWith("/") || next.startsWith("//")) {
    return "";
  }

  return next;
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null);

    const email = cleanEmail(body?.email);
    const next = safeNext(body?.next);

    if (!email || !email.includes("@")) {
      return json(400, {
        allowed: false,
        error: "Email address required",
      });
    }

    const hdrs = await headers();
    const subdomain = getSubdomainFromHost(hdrs.get("host"));

    const admin = supabaseAdmin();

    /*
      Setup exception:
      The super user has confirmed their email, but the tenant/membership
      does not exist yet. Allow them to sign in only when:
      - they are on the reserved tenant subdomain
      - the next page is /setup
      - their email matches tenant_signup_intents
    */
    if (subdomain && (next === "/setup" || next.startsWith("/setup?"))) {
      const { data: intent } = await admin
        .from("tenant_signup_intents")
        .select("id, status")
        .eq("root_domain", ROOT_DOMAIN)
        .eq("subdomain", subdomain)
        .eq("admin_email", email)
        .in("status", ["pending_email", "confirmed"])
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (intent?.id) {
        return json(200, {
          allowed: true,
          reason: "signup_setup_intent",
        });
      }
    }

    /*
      Normal tenant login:
      User must already have a membership for this tenant.
    */
    if (subdomain) {
      const { data: tenant } = await admin
        .from("tenants")
        .select("id")
        .eq("domain", ROOT_DOMAIN)
        .eq("subdomain", subdomain)
        .maybeSingle();

      if (!tenant?.id) {
        return json(403, {
          allowed: false,
          error: "Workspace not found.",
        });
      }

      const { data: authUsers, error: listError } =
        await admin.auth.admin.listUsers();

      if (listError) {
        return json(500, {
          allowed: false,
          error: listError.message,
        });
      }

      const matchedUser = authUsers.users.find(
        (user) => cleanEmail(user.email) === email
      );

      if (!matchedUser?.id) {
        return json(403, {
          allowed: false,
          error: "That email isn't authorised for this tenant.",
        });
      }

      const { data: membership } = await admin
        .from("memberships")
        .select("id")
        .eq("tenant_id", tenant.id)
        .eq("user_id", matchedUser.id)
        .maybeSingle();

      if (!membership?.id) {
        return json(403, {
          allowed: false,
          error: "That email isn't authorised for this tenant.",
        });
      }

      return json(200, {
        allowed: true,
        reason: "tenant_membership",
      });
    }

    /*
      App/root login fallback:
      Allow if the email belongs to any existing platform user.
    */
    const { data: authUsers, error: listError } = await admin.auth.admin.listUsers();

    if (listError) {
      return json(500, {
        allowed: false,
        error: listError.message,
      });
    }

    const matchedUser = authUsers.users.find(
      (user) => cleanEmail(user.email) === email
    );

    if (!matchedUser?.id) {
      return json(403, {
        allowed: false,
        error: "Account not found.",
      });
    }

    return json(200, {
      allowed: true,
      reason: "platform_user",
    });
  } catch (err) {
    return json(500, {
      allowed: false,
      error: err instanceof Error ? err.message : "Auth check failed",
    });
  }
}
