// apps/app/src/app/apps/page.tsx
import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";
import { resolveTenantEnvironment } from "@/lib/tenant/environment-host";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function AppsAliasPage() {
  const resolved = await resolveTenantEnvironment();

  if (!resolved?.tenantId) {
    redirect("/tenant-available");
  }

  const supabase = await supabaseServer();

  const { data: userRes } = await supabase.auth.getUser();

  if (!userRes.user) {
    redirect("/login");
  }

  redirect("/");
}
