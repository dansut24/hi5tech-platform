import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

type CookieOptions = {
  path?: string;
  domain?: string;
  maxAge?: number;
  expires?: Date;
  httpOnly?: boolean;
  secure?: boolean;
  sameSite?: "lax" | "strict" | "none";
};

function getCookieValue(cookieStore: any, name: string): string | undefined {
  if (cookieStore && typeof cookieStore.getAll === "function") {
    const all = cookieStore.getAll();
    const found = all?.find((c: any) => c?.name === name);
    return found?.value;
  }
  if (cookieStore && typeof cookieStore.get === "function") {
    return cookieStore.get(name)?.value;
  }
  return undefined;
}

// IMPORTANT: async because Next 16 cookies() can be a Promise (sync dynamic API)
export async function createSupabaseServerClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return getCookieValue(cookieStore as any, name);
        },
        set(name: string, value: string, options: CookieOptions) {
          (cookieStore as any).set({ name, value, ...options });
        },
        remove(name: string, options: CookieOptions) {
          (cookieStore as any).set({ name, value: "", ...options });
        }
      }
    }
  );
}
