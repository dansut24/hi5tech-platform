import { NextResponse } from "next/server";
import { createServerClient, type CookieOptions } from "@supabase/ssr";

export const dynamic = "force-dynamic";

type CookieToSet = {
  name: string;
  value: string;
  options: CookieOptions;
};

function json(status: number, body: any) {
  return NextResponse.json(body, {
    status,
    headers: {
      "cache-control": "no-store",
    },
  });
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);

  const accessToken = String(body?.access_token ?? "");
  const refreshToken = String(body?.refresh_token ?? "");

  if (!accessToken || !refreshToken) {
    return json(400, { error: "Missing auth tokens" });
  }

  const response = NextResponse.json(
    { ok: true },
    {
      headers: {
        "cache-control": "no-store",
      },
    }
  );

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return [];
        },
        setAll(cookiesToSet: CookieToSet[]) {
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options);
          });
        },
      },
    }
  );

  const { error } = await supabase.auth.setSession({
    access_token: accessToken,
    refresh_token: refreshToken,
  });

  if (error) {
    return json(401, { error: error.message });
  }

  return response;
}
