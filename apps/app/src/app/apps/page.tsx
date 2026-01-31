import Link from "next/link";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@hi5tech/auth";
import { MODULE_PATH, pickDefaultModule, type ModuleKey } from "@hi5tech/rbac";

const ALL: ModuleKey[] = ["itsm", "control", "selfservice", "admin"];

export default async function AppsPage() {
  const supabase = await createSupabaseServerClient();

  const { data: userRes } = await supabase.auth.getUser();
  const user = userRes.user;

  if (!user) redirect("/login");

  // 1) Get all memberships for this user
  const { data: memberships, error: mErr } = await supabase
    .from("memberships")
    .select("id, tenant_id, role, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (mErr) {
    return (
      <div className="min-h-dvh p-6">
        <h1 className="text-xl font-semibold">Apps</h1>
        <p className="mt-2 text-sm text-red-600">{mErr.message}</p>
      </div>
    );
  }

  const membershipIds = (memberships ?? []).map((m) => m.id);

  if (!membershipIds.length) {
    return (
      <div className="min-h-dvh p-6">
        <h1 className="text-xl font-semibold">No access</h1>
        <p className="mt-2 opacity-80">No tenant membership found for your user.</p>
        <p className="mt-2 text-sm opacity-70">
          Go to <span className="font-mono">/admin</span> and assign modules (or seed via SQL).
        </p>
      </div>
    );
  }

  // 2) Get module assignments for those memberships
  const { data: rows, error: aErr } = await supabase
    .from("module_assignments")
    .select("membership_id, module")
    .in("membership_id", membershipIds);

  if (aErr) {
    return (
      <div className="min-h-dvh p-6">
        <h1 className="text-xl font-semibold">Apps</h1>
        <p className="mt-2 text-sm text-red-600">{aErr.message}</p>
      </div>
    );
  }

  const allowed = new Set<ModuleKey>();
  for (const r of rows ?? []) {
    const mod = r.module as ModuleKey;
    if (ALL.includes(mod)) allowed.add(mod);
  }

  const modules = Array.from(allowed);

  if (!modules.length) {
    return (
      <div className="min-h-dvh p-6">
        <h1 className="text-xl font-semibold">No access</h1>
        <p className="mt-2 opacity-80">Your account has no modules assigned yet.</p>
        <p className="mt-2 text-sm opacity-70">
          Go to <span className="font-mono">/admin/users</span> and tick modules for your membership.
        </p>
      </div>
    );
  }

  if (modules.length === 1) {
    const m = pickDefaultModule(modules);
    redirect(MODULE_PATH[m]);
  }

  return (
    <div className="min-h-dvh p-4 sm:p-8">
      <h1 className="text-2xl font-semibold">Choose a module</h1>
      <p className="mt-2 opacity-80">Your session is active across all modules.</p>

      <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {modules.map((m) => (
          <Link
            key={m}
            href={MODULE_PATH[m]}
            className="rounded-2xl border p-5 hover:bg-black/5 dark:hover:bg-white/5 transition"
          >
            <div className="text-lg font-semibold">{m.toUpperCase()}</div>
            <div className="text-sm opacity-80 mt-1">Open {m} module</div>
          </Link>
        ))}
      </div>

      <div className="mt-8 text-xs opacity-60">
        Modules detected: {modules.join(", ")}
      </div>
    </div>
  );
}
