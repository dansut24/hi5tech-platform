import { cookies } from "next/headers";
import { createSupabaseServerClient } from "@hi5tech/auth";

/**
 * Server-only Supabase client for the app workspace.
 * Wraps the cookie adapter required by @hi5tech/auth.
 */
export function supabaseServer() {
  const cookieStore = cookies();

  // Provide the cookie adapter expected by your auth package
  return createSupabaseServerClient({
    cookies: {
      get(name: string) {
        return cookieStore.get(name)?.value;
      },
      set(name: string, value: string, options?: any) {
        cookieStore.set({ name, value, ...options });
      },
      remove(name: string, options?: any) {
        cookieStore.set({ name, value: "", ...options, maxAge: 0 });
      },
    },
  });
}
