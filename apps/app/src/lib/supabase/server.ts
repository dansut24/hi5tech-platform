// // apps/app/src/lib/supabase/server.ts
import { cookies } from "next/headers";
import { createSupabaseServerClient } from "@hi5tech/auth";

/**
 * Server-component Supabase client.
 * IMPORTANT: Server Components cannot mutate cookies.
 * Cookie refresh happens in /src/proxy.ts.
 */
export async function supabaseServer() {
  const cookieStore = await cookies();

  return createSupabaseServerClient({
    get(name: string) {
      return cookieStore.get(name)?.value;
    },

    // Server Components cannot set/remove cookies.
    // Proxy handles refresh + cookie writes.
    set() {},
    remove() {},
  });
}
