import Link from "next/link";
import { resolveTenantEnvironment } from "@/lib/tenant/environment-host";
import { supabaseAdmin } from "@/lib/supabase/admin";

export default async function StagingChangesBanner() {
  try {
    const resolved = await resolveTenantEnvironment();

    if (!resolved?.tenantId || resolved.environmentKey !== "staging") {
      return null;
    }

    const admin = supabaseAdmin();

    const { count } = await admin
      .from("tenant_environment_change_requests")
      .select("id", { count: "exact", head: true })
      .eq("tenant_id", resolved.tenantId)
      .eq("source_environment_key", "staging")
      .eq("target_environment_key", "production")
      .in("status", ["selected", "scheduled"]);

    const total = count ?? 0;

    if (total <= 0) return null;

    return (
      <div className="sticky top-0 z-50 border-b border-amber-500/20 bg-amber-500/12 px-4 py-3 text-amber-900 backdrop-blur-xl dark:text-amber-100">
        <div className="mx-auto flex max-w-[1500px] flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-sm font-bold">
            {total} staging change{total === 1 ? "" : "s"} selected for production review.
          </div>

          <Link href="/admin/environments/changes" className="hi5-btn-ghost w-auto text-xs">
            Review changes
          </Link>
        </div>
      </div>
    );
  } catch {
    return null;
  }
}
