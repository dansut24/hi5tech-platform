// apps/app/src/lib/supabase/server.ts
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import type { CookieOptions } from "@supabase/ssr";

type CookieToSet = {
  name: string;
  value: string;
  options?: CookieOptions;
};

const ROOT_DOMAIN = process.env.NEXT_PUBLIC_ROOT_DOMAIN || "hi5tech.co.uk";

function isLocalHost(host?: string | null) {
  if (!host) return false;
  const h = host.split(":")[0].toLowerCase();
  return h === "localhost" || h === "127.0.0.1";
}

function normalizeCookieOptions(opts: CookieOptions | undefined, host?: string | null): CookieOptions | undefined {
  const options: CookieOptions = { ...(opts || {}) };

  // Always make sure cookies work across all tenant subdomains in prod
  if (!isLocalHost(host) && !host?.endsWith(".vercel.app")) {
    options.domain = `.${ROOT_DOMAIN}`;
  }

  // Always available everywhere in the app
  options.path = options.path ?? "/";

  // In prod, secure cookies (Supabase normally does this, but we keep it consistent)
  // If you ever test on http locally, secure must be false.
  if (isLocalHost(host)) {
    options.secure = false;
  } else {
    options.secure = options.secure ?? true;
  }

  // Lax is best default for typical web apps (works with redirects)
  options.sameSite = options.sameSite ?? "lax";

  return options;
}

export async function supabaseServer() {
  const cookieStore = await cookies();
  const host = cookieStore.get("x-forwarded-host")?.value || null;

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet: CookieToSet[]) {
          try {
            for (const { name, value, options } of cookiesToSet) {
              cookieStore.set(name, value, normalizeCookieOptions(options, host));
            }
          } catch {
            // Some server contexts can’t mutate cookies (safe to ignore)
          }
        },
      },
    }
  );

  return supabase;
}
