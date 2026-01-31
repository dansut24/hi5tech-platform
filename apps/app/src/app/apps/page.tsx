import Link from "next/link";
import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";
import { logoutAction } from "./actions";

type ModuleKey = "itsm" | "control" | "selfservice" | "admin";

const ALL: ModuleKey[] = ["itsm", "control", "selfservice", "admin"];

const MODULE_PATH: Record<ModuleKey, string> = {
  itsm: "/itsm",
  control: "/control",
  selfservice: "/selfservice",
  admin: "/admin",
};

export default async function AppsLandingPage() {
  const supabase = await supabaseServer();

  const { data: userRes } = await supabase.auth.getUser();
  const user = userRes.user;
  if (!user) redirect("/login");

  // memberships -> module assignments
  const { data: memberships, error: mErr } = await supabase
    .from("memberships")
    .select("id, tenant_id, role, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (mErr) {
    return (
      <div className="min-h-dvh p-6">
        <h1 className="text-2xl font-semibold">Apps</h1>
        <p className="mt-2 text-sm text-red-600">{mErr.message}</p>
        <form action={logoutAction} className="mt-6">
          <button className="rounded-xl border hi5-border px-4 py-2 text-sm">
            Logout
          </button>
        </form>
      </div>
    );
  }

  const membershipIds = (memberships ?? []).map((m) => m.id);

  let modules: ModuleKey[] = [];
  if (membershipIds.length) {
    const { data: rows } = await supabase
      .from("module_assignments")
      .select("membership_id, module")
      .in("membership_id", membershipIds);

    const allowed = new Set<ModuleKey>();
    for (const r of rows ?? []) {
      const mod = r.module as ModuleKey;
      if (ALL.includes(mod)) allowed.add(mod);
    }
    modules = Array.from(allowed);
  }

  return (
    <div className="min-h-dvh p-4 sm:p-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Hi5Tech</h1>
          <p className="mt-1 text-sm opacity-80">Choose a module</p>
        </div>

        <form action={logoutAction}>
          <button className="rounded-xl border hi5-border px-4 py-2 text-sm hover:bg-black/5 dark:hover:bg-white/5 transition">
            Logout
          </button>
        </form>
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {(modules.length ? modules : ALL).map((m) => (
          <Link
            key={m}
            href={MODULE_PATH[m]}
            className="rounded-2xl border hi5-border p-5 hi5-card hover:bg-black/5 dark:hover:bg-white/5 transition"
          >
            <div className="text-lg font-semibold">{m.toUpperCase()}</div>
            <div className="text-sm opacity-80 mt-1">Open {m} module</div>
          </Link>
        ))}
      </div>

      {!modules.length ? (
        <div className="mt-6 text-sm opacity-70">
          No module assignments found yet. Ask an admin to assign modules for your
          membership.
        </div>
      ) : null}
    </div>
  );
}
