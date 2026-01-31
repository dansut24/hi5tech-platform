import { createServerClient } from "@supabase/ssr";
import type { CookieOptions } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";

type CookieGet = (name: string) => string | undefined;

type CookieSetItem = {
  name: string;
  value: string;
  options?: CookieOptions;
};

type CookieAdapter = {
  get: CookieGet;
  set: (name: string, value: string, options?: CookieOptions) => void;
  remove: (name: string, options?: CookieOptions) => void;
};

function mustEnv(name: string) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env var: ${name}`);
  return v;
}

export function createSupabaseServerClientFromCookies(
  cookies: CookieAdapter
): SupabaseClient {
  const url = mustEnv("NEXT_PUBLIC_SUPABASE_URL");
  const anon = mustEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY");

  return createServerClient(url, anon, {
    cookies: {
      get(name: string) {
        return cookies.get(name);
      },
      set(name: string, value: string, options: CookieOptions) {
        cookies.set(name, value, options);
      },
      remove(name: string, options: CookieOptions) {
        cookies.remove(name, options);
      },
    },
  });
}

/**
 * Legacy name used around the app. Keep it so we don’t have to refactor imports.
 * It expects you to pass a Next.js cookie store wrapper from apps/app.
 */
export function createSupabaseServerClient(
  cookies: CookieAdapter
): SupabaseClient {
  return createSupabaseServerClientFromCookies(cookies);
}
