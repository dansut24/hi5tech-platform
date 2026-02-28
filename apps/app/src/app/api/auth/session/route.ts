import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient, type CookieOptions } from "@supabase/ssr";

type Body = {
  access_token: string;
  refresh_token: string;
};

type CookieToSet = {
  name: string;
  value: string;
  options?: CookieOptions;
};

const ROOT_DOMAIN = process.env.NEXT_PUBLIC_ROOT_DOMAIN || "hi5tech.co.uk";

function cookieDomainFromHost(host?: string | null) {
  const h = String(host || "").split(":")[0].toLowerCase();
  if (!h) return undefined;
  if (h === "localhost" || h.endsWith(".vercel.app")) return undefined;
  return `.${ROOT_DOMAIN}`;
}

export async function POST(req: Request) {
  const cookieStore = await cookies();
  const { access_token, refresh_token } = (await req.json().catch(() => ({}))) as Partial<Body>;

  if (!access_token || !refresh_token) {
    return NextResponse.json({ error: "Missing tokens" }, { status: 400 });
  }

  const host = req.headers.get("host");
  const domain = cookieDomainFromHost(host);

  const res = NextResponse.json({ ok: true });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet: CookieToSet[]) {
          for (const { name, value, options } of cookiesToSet) {
            // ✅ Force shared domain so every tenant subdomain sees auth
            res.cookies.set(name, value, {
              ...options,
              domain: options?.domain ?? domain,
              path: options?.path ?? "/",
            });
          }
        },
      },
    }
  );

  // ✅ This is the key line: it persists session into cookies via setAll()
  const { error } = await supabase.auth.setSession({ access_token, refresh_token });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 401 });
  }

  return res;
}
