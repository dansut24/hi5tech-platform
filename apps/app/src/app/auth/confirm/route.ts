import { NextResponse, type NextRequest } from "next/server";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import type { EmailOtpType } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

type CookieToSet = {
  name: string;
  value: string;
  options: CookieOptions;
};

function safeNext(value: string | null) {
  if (!value || !value.startsWith("/")) return "/setup";
  if (value.startsWith("//")) return "/setup";
  return value;
}

export async function GET(req: NextRequest) {
  const url = new URL(req.url);

  const tokenHash = url.searchParams.get("token_hash");
  const type = (url.searchParams.get("type") || "email") as EmailOtpType;
  const next = safeNext(url.searchParams.get("next"));

  const redirectUrl = new URL(next, url.origin);

  if (!tokenHash) {
    const failedUrl = new URL("/auth/error", url.origin);
    failedUrl.searchParams.set("message", "Missing confirmation token");
    return NextResponse.redirect(failedUrl);
  }

  const response = NextResponse.redirect(redirectUrl);

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return req.cookies.getAll();
        },
        setAll(cookiesToSet: CookieToSet[]) {
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options);
          });
        },
      },
    }
  );

  const { error } = await supabase.auth.verifyOtp({
    token_hash: tokenHash,
    type,
  });

  if (error) {
    const failedUrl = new URL("/auth/error", url.origin);
    failedUrl.searchParams.set("message", error.message);
    return NextResponse.redirect(failedUrl);
  }

  return response;
}
