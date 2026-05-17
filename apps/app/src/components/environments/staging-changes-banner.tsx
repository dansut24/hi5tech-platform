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
      <div className="relative z-40 w-full border-b border-amber-500/25 bg-amber-500/12 px-3 py-2 text-amber-950 backdrop-blur-xl dark:bg-amber-400/10 dark:text-amber-100">
        <div className="mx-auto flex w-full max-w-[1500px] items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="text-xs font-black uppercase tracking-[0.16em] opacity-75">
              Staging
            </div>

            <div className="truncate text-sm font-extrabold sm:text-base">
              {total} change{total === 1 ? "" : "s"} selected for production review
            </div>
          </div>

          <Link
            href="/admin/environments/changes"
            className="shrink-0 rounded-full border border-amber-500/30 bg-white/65 px-3 py-2 text-xs font-black text-amber-950 shadow-sm backdrop-blur transition hover:bg-white/85 dark:bg-black/25 dark:text-amber-100 dark:hover:bg-black/35"
          >
            Review
          </Link>
        </div>
      </div>
    );
  } catch {
    return null;
  }
}
