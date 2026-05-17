import Link from "next/link";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { requirePlatformAdmin } from "@/lib/platform-admin/guard";
import PlatformAdminShell from "@/components/platform-admin/platform-admin-shell";

export const dynamic = "force-dynamic";

function formatDate(value?: string | null) {
  if (!value) return "—";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";

  return date.toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function safeJson(value: any) {
  if (!value) return "{}";

  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return "{}";
  }
}

function actionLabel(action?: string | null) {
  const value = String(action || "").trim();

  if (!value) return "Unknown action";

  return value
    .replace(/^tenant_/, "Tenant ")
    .replace(/^platform_/, "Platform ")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function targetLabel(targetType?: string | null, targetId?: string | null) {
  const type = String(targetType || "").trim();
  const id = String(targetId || "").trim();

  if (!type && !id) return "—";
  if (!id) return type || "—";

  return `${type || "target"} · ${id}`;
}

function AuditActionPill({ action }: { action?: string | null }) {
  const value = String(action || "");

  const tone =
    value.includes("suspend") ||
    value.includes("disabled") ||
    value.includes("failed")
      ? "border-red-500/25 bg-red-500/10 text-red-700 dark:text-red-200"
      : value.includes("trial") ||
          value.includes("pending") ||
          value.includes("verified")
        ? "border-amber-500/25 bg-amber-500/10 text-amber-700 dark:text-amber-200"
        : "border-emerald-500/25 bg-emerald-500/10 text-emerald-700 dark:text-emerald-200";

  return (
    <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-bold ${tone}`}>
      {actionLabel(action)}
    </span>
  );
}

async function loadAuditLogs() {
  const admin = supabaseAdmin();

  const { data, error } = await admin
    .from("platform_admin_audit_log")
    .select("id, actor_user_id, actor_email, action, target_type, target_id, metadata, created_at")
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) {
    return {
      logs: [],
      error: error.message,
    };
  }

  return {
    logs: data ?? [],
    error: null,
  };
}

export default async function PlatformAdminAuditPage() {
  const adminContext = await requirePlatformAdmin();
  const { logs, error } = await loadAuditLogs();

  return (
    <PlatformAdminShell admin={adminContext}>
      <div className="space-y-5">
        <div className="hi5-panel p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <Link href="/admin-console" className="text-sm font-bold hi5-accent">
                ← Back to platform admin
              </Link>

              <div className="mt-4 text-xs uppercase tracking-[0.18em] opacity-60">
                Platform admin
              </div>

              <h1 className="mt-2 text-3xl font-black tracking-tight">
                Audit log
              </h1>

              <p className="mt-2 max-w-3xl text-sm leading-6 opacity-75">
                Review platform-admin actions such as tenant suspension, trial extensions,
                domain approvals, feature changes and future billing changes.
              </p>
            </div>

            <div className="rounded-2xl border hi5-border bg-black/5 px-4 py-3 text-sm dark:bg-white/5">
              <div className="text-xs opacity-65">Showing</div>
              <div className="mt-1 font-black">{logs.length} latest actions</div>
            </div>
          </div>
        </div>

        {error ? (
          <div className="rounded-2xl border border-red-500/25 bg-red-500/10 p-4 text-sm text-red-700 dark:text-red-200">
            {error}
          </div>
        ) : null}

        <div className="hi5-panel p-5">
          <div className="text-lg font-extrabold">Recent platform actions</div>

          <div className="mt-5 space-y-3">
            {logs.length ? (
              logs.map((log: any) => (
                <div
                  key={log.id}
                  className="rounded-3xl border hi5-border bg-black/5 p-4 dark:bg-white/5"
                >
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                    <div className="min-w-0">
                      <AuditActionPill action={log.action} />

                      <div className="mt-3 text-sm font-bold">
                        {targetLabel(log.target_type, log.target_id)}
                      </div>

                      <div className="mt-1 text-xs opacity-65">
                        By {log.actor_email || log.actor_user_id || "Unknown actor"} ·{" "}
                        {formatDate(log.created_at)}
                      </div>
                    </div>

                    <div className="text-xs opacity-65">
                      ID: <span className="font-mono">{log.id}</span>
                    </div>
                  </div>

                  <details className="mt-4 rounded-2xl border hi5-border bg-white/45 p-3 dark:bg-black/20">
                    <summary className="cursor-pointer text-sm font-bold">
                      View metadata
                    </summary>

                    <pre className="mt-3 max-h-[360px] overflow-auto whitespace-pre-wrap break-words rounded-xl bg-black/5 p-3 text-xs dark:bg-white/5">
                      {safeJson(log.metadata)}
                    </pre>
                  </details>
                </div>
              ))
            ) : (
              <div className="rounded-2xl border hi5-border bg-black/5 p-4 text-sm opacity-70 dark:bg-white/5">
                No platform audit logs found yet.
              </div>
            )}
          </div>
        </div>
      </div>
    </PlatformAdminShell>
  );
}
