// src/lib/supabase/server.ts
import { cookies } from "next/headers";
import { createSupabaseServerClient } from "@hi5tech/auth";

/**
 * Server-only Supabase client for the app workspace.
 * This is the ONLY place createSupabaseServerClient is allowed.
 */
export async function supabaseServer() {
  const cookieStore = await cookies();

  return createSupabaseServerClient({
    get(name: string) {
      return cookieStore.get(name)?.value;
    },

    set(name: string, value: string, options?: any) {
      cookieStore.set({
        name,
        value,
        ...(options ?? {}),
      });
    },

    remove(name: string, options?: any) {
      // Next runtimes differ; delete may or may not exist
      const anyStore = cookieStore as any;

      if (typeof anyStore.delete === "function") {
        anyStore.delete(name);
        return;
      }

      // Fallback: expire cookie
      cookieStore.set({
        name,
        value: "",
        ...(options ?? {}),
        maxAge: 0,
      });
    },
  });
}
