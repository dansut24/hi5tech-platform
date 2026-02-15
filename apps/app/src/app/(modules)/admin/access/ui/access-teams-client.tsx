"use client";

import { useMemo, useState } from "react";
import { createBrowserClient } from "@supabase/ssr";
import {
  DEFAULT_ROLE_SCOPES,
  RECOMMENDED_TEAMS,
  scopeGroupsForModule,
  type ModuleKey,
  type RoleKey,
  type ScopeKey,
} from "@/lib/access/scopes";

type TeamRow = {
  id: string;
  key: string | null;
  name: string;
  modules: string[];
  is_default_triage: boolean;
};

type TeamRoleRow = {
  id: string;
  team_id: string;
  role_key: RoleKey;
  role_name: string;
  scopes: ScopeKey[];
};

function cn(...s: Array<string | false | null | undefined>) {
  return s.filter(Boolean).join(" ");
}

export default function AccessTeamsClient({
  moduleKey,
  tenant,
  initial,
}: {
  moduleKey: ModuleKey;
  tenant: { id: string; name: string };
  initial: { teams: TeamRow[]; roles: TeamRoleRow[] };
}) {
  const supabase = useMemo(
    () =>
      createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      ),
    []
  );

  const [teams, setTeams] = useState<TeamRow[]>(initial.teams);
  const [roles, setRoles] = useState<TeamRoleRow[]>(initial.roles);
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const filteredTeams = useMemo(() => {
    return teams.filter((t) => Array.isArray(t.modules) && t.modules.includes(moduleKey));
  }, [teams, moduleKey]);

  const recommendedForModule = useMemo(() => {
    return RECOMMENDED_TEAMS.filter((t) => t.module === moduleKey);
  }, [moduleKey]);

  const [recommendedSelected, setRecommendedSelected] = useState<Record<string, boolean>>(() => {
    const existsByKey = new Set(filteredTeams.map((t) => t.key).filter(Boolean) as string[]);
    const obj: Record<string, boolean> = {};
    for (const r of recommendedForModule) obj[r.key] = existsByKey.has(r.key);
    return obj;
  });

  const [customName, setCustomName] = useState("");

  const roleGroups = useMemo(() => scopeGroupsForModule(moduleKey), [moduleKey]);

  function rolesForTeam(teamId: string) {
    return roles.filter((r) => r.team_id === teamId);
  }

  async function refresh() {
    setErr(null);
    const tRes = await supabase
      .from("teams")
      .select("id, key, name, modules, is_default_triage")
      .eq("tenant_id", tenant.id)
      .order("name", { ascending: true });

    if (tRes.error) {
      setErr(tRes.error.message);
      return;
    }

    const t = (tRes.data ?? []) as TeamRow[];
    setTeams(t);

    const teamIds = t.map((x) => x.id);
    if (!teamIds.length) {
      setRoles([]);
      return;
    }

    const rRes = await supabase
      .from("team_roles")
      .select("id, team_id, role_key, role_name, scopes")
      .in("team_id", teamIds);

    if (rRes.error) {
      setErr(rRes.error.message);
      return;
    }

    setRoles((rRes.data ?? []) as any);
  }

  async function createTeam(name: string, key: string | null, isDefaultTriage: boolean) {
    const ins = await supabase
      .from("teams")
      .insert({
        tenant_id: tenant.id,
        key,
        name,
        modules: [moduleKey],
        is_default_triage: isDefaultTriage,
      })
      .select("id")
      .single();

    if (ins.error) throw new Error(ins.error.message);

    const teamId = (ins.data as any).id as string;

    // Create default roles for the team
    const roleRows: Array<{ team_id: string; role_key: RoleKey; role_name: string; scopes: ScopeKey[] }> =
      (["viewer", "agent", "lead", "admin"] as RoleKey[]).map((rk) => ({
        team_id: teamId,
        role_key: rk,
        role_name: rk.toUpperCase(),
        scopes: (DEFAULT_ROLE_SCOPES[rk] ?? []) as ScopeKey[],
      }));

    const rIns = await supabase.from("team_roles").insert(roleRows);
    if (rIns.error) throw new Error(rIns.error.message);
  }

  async function onCreateSelectedRecommended() {
    setBusy("create-recommended");
    setErr(null);
    try {
      for (const r of recommendedForModule) {
        if (!recommendedSelected[r.key]) continue;

        // already exists?
        const exists = filteredTeams.some((t) => t.key === r.key);
        if (exists) continue;

        await createTeam(r.name, r.key, r.key === "service_desk");
      }

      await refresh();
    } catch (e: any) {
      setErr(e?.message || "Failed to create teams");
    } finally {
      setBusy(null);
    }
  }

  async function onCreateCustom() {
    const name = customName.trim();
    if (!name) return;

    setBusy("create-custom");
    setErr(null);
    try {
      await createTeam(name, null, false);
      setCustomName("");
      await refresh();
    } catch (e: any) {
      setErr(e?.message || "Failed to create custom team");
    } finally {
      setBusy(null);
    }
  }

  async function toggleScope(teamRoleId: string, scope: ScopeKey) {
    setBusy(teamRoleId);
    setErr(null);
    try {
      const role = roles.find((r) => r.id === teamRoleId);
      if (!role) return;

      const next = new Set(role.scopes ?? []);
      if (next.has(scope)) next.delete(scope);
      else next.add(scope);

      const upd = await supabase
        .from("team_roles")
        .update({ scopes: Array.from(next) })
        .eq("id", teamRoleId);

      if (upd.error) throw new Error(upd.error.message);

      setRoles((prev) =>
        prev.map((r) => (r.id === teamRoleId ? { ...r, scopes: Array.from(next) as any } : r))
      );
    } catch (e: any) {
      setErr(e?.message || "Failed to update scopes");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-6">
      <div className="hi5-panel">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-lg font-semibold">Access — {moduleKey.toUpperCase()}</div>
            <div className="text-sm opacity-70">
              Create teams and control permissions per team role. Tenant: {tenant.name}
            </div>
          </div>
        </div>

        {err && (
          <div className="mt-4 rounded-2xl border border-red-500/30 bg-red-500/10 p-3 text-sm">
            {err}
          </div>
        )}
      </div>

      {/* Recommended teams */}
      <div className="hi5-panel">
        <div className="text-sm font-semibold">Recommended teams</div>
        <div className="text-xs opacity-70 mt-1">
          Tick the teams you want created for this module (we’ll include Service Desk where relevant).
        </div>

        <div className="mt-4 grid sm:grid-cols-2 gap-3">
          {recommendedForModule.map((r) => (
            <label
              key={r.key}
              className="flex items-center gap-3 rounded-2xl border hi5-border p-3 hover:bg-black/5 dark:hover:bg-white/5 transition cursor-pointer"
            >
              <input
                type="checkbox"
                checked={!!recommendedSelected[r.key]}
                onChange={(e) =>
                  setRecommendedSelected((p) => ({ ...p, [r.key]: e.target.checked }))
                }
              />
              <div className="min-w-0">
                <div className="text-sm font-semibold truncate">{r.name}</div>
                <div className="text-xs opacity-60 truncate">{r.key}</div>
              </div>
            </label>
          ))}
        </div>

        <div className="mt-4">
          <button
            className="hi5-btn"
            disabled={busy !== null}
            onClick={onCreateSelectedRecommended}
          >
            {busy === "create-recommended" ? "Creating..." : "Create selected"}
          </button>
        </div>
      </div>

      {/* Custom team */}
      <div className="hi5-panel">
        <div className="text-sm font-semibold">Custom team</div>
        <div className="mt-3 flex gap-3">
          <input
            className="hi5-input flex-1"
            placeholder="e.g., VIP Support, Projects, Field Engineers..."
            value={customName}
            onChange={(e) => setCustomName(e.target.value)}
          />
          <button className="hi5-btn" disabled={busy !== null || !customName.trim()} onClick={onCreateCustom}>
            {busy === "create-custom" ? "Creating..." : "Add"}
          </button>
        </div>
      </div>

      {/* Teams list + permissions */}
      <div className="hi5-panel">
        <div className="text-sm font-semibold">Teams ({filteredTeams.length})</div>

        <div className="mt-4 space-y-4">
          {filteredTeams.map((t) => {
            const teamRoles = rolesForTeam(t.id);

            return (
              <div key={t.id} className="rounded-2xl border hi5-border p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="text-sm font-semibold truncate">
                      {t.name}{" "}
                      {t.is_default_triage ? (
                        <span className="ml-2 text-[11px] px-2 py-0.5 rounded-full border hi5-border opacity-80">
                          Default triage
                        </span>
                      ) : null}
                    </div>
                    <div className="text-xs opacity-60 truncate">
                      Key: {t.key ?? "custom"} • Modules: {(t.modules ?? []).join(", ")}
                    </div>
                  </div>
                </div>

                <div className="mt-4 grid lg:grid-cols-2 gap-4">
                  {teamRoles.map((r) => (
                    <div key={r.id} className="rounded-2xl border hi5-border p-3">
                      <div className="text-sm font-semibold">{r.role_name}</div>
                      <div className="text-xs opacity-60">Role key: {r.role_key}</div>

                      <div className="mt-3 space-y-3">
                        {roleGroups.map((g) => (
                          <div key={g.group}>
                            <div className="text-xs font-semibold opacity-80">{g.group}</div>
                            <div className="mt-2 space-y-2">
                              {g.items.map((s) => {
                                const checked = (r.scopes ?? []).includes(s.key);
                                const loading = busy === r.id;

                                return (
                                  <label
                                    key={s.key}
                                    className={cn(
                                      "flex items-start gap-3 rounded-xl border hi5-border p-2 cursor-pointer",
                                      "hover:bg-black/5 dark:hover:bg-white/5 transition"
                                    )}
                                  >
                                    <input
                                      type="checkbox"
                                      checked={checked}
                                      disabled={loading}
                                      onChange={() => toggleScope(r.id, s.key)}
                                    />
                                    <div className="min-w-0">
                                      <div className="text-xs font-semibold">{s.label}</div>
                                      <div className="text-[11px] opacity-60">{s.key}</div>
                                      {s.description ? (
                                        <div className="text-[11px] opacity-60 mt-0.5">{s.description}</div>
                                      ) : null}
                                    </div>
                                  </label>
                                );
                              })}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}

          {filteredTeams.length === 0 && (
            <div className="text-sm opacity-70">No teams yet for this module. Create one above.</div>
          )}
        </div>
      </div>
    </div>
  );
}
