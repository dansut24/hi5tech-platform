import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import type { CookieOptions } from "@supabase/ssr";

const ROOT_DOMAIN = process.env.NEXT_PUBLIC_ROOT_DOMAIN || "hi5tech.co.uk";

type CookieToSet = {
  name: string;
  value: string;
  options?: CookieOptions;
};

function withSharedDomain(options?: CookieOptions): CookieOptions {
  return {
    path: "/",
    sameSite: "lax",
    secure: true,
    ...options,
    // ✅ critical: share auth across all tenant subdomains
    domain: `.${ROOT_DOMAIN}`,
  };
}

export async function supabaseServer() {
  const cookieStore = await cookies();

  return createServerClient(
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
              cookieStore.set(name, value, withSharedDomain(options));
            }
          } catch {
            // safe in server contexts that cannot set cookies
          }
        },
      },
    }
  );
}
