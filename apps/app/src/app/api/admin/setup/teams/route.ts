// apps/app/src/app/api/admin/setup/teams/route.ts
import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { supabaseServer } from "@/lib/supabase/server";
import { getEffectiveHost, parseTenantHost } from "@/lib/tenant/tenant-from-host";
import {
  DEFAULT_ROLE_SCOPES,
  RECOMMENDED_TEAMS,
  type RecommendedTeamKey,
  type RoleKey,
  type ScopeKey,
} from "@/lib/access/scopes";

export const dynamic = "force-dynamic";

type CustomTeamInput = {
  name: string;
  modules?: Array<"itsm" | "control" | "selfservice">;
  role_scopes?: Partial<Record<RoleKey, ScopeKey[]>>;
};

type Payload = {
  selected_recommended?: RecommendedTeamKey[];
  custom?: CustomTeamInput[];
  ensure_service_desk?: boolean;
};

function json(ok: boolean, status: number, body: any) {
  return new NextResponse(JSON.stringify({ ok, ...body }), {
    status,
    headers: { "content-type": "application/json", "cache-control": "no-store" },
  });
}

function uniq<T>(arr: T[]) {
  return Array.from(new Set(arr));
}

export async function POST(req: Request) {
  try {
    const supabase = await supabaseServer();

    const { data: userRes } = await supabase.auth.getUser();
    const user = userRes.user;
    if (!user) return json(false, 401, { error: "Not authenticated" });

    const host = getEffectiveHost(await headers());
    const parsed = parseTenantHost(host);
    if (!parsed.subdomain) return json(false, 400, { error: "No tenant subdomain" });

    const tenantRes = await supabase
      .from("tenants")
      .select("id, domain, subdomain, name, is_active")
      .eq("domain", parsed.rootDomain)
      .eq("subdomain", parsed.subdomain)
      .maybeSingle();

    if (tenantRes.error) return json(false, 400, { error: tenantRes.error.message });

    const tenant = tenantRes.data;
    if (!tenant || tenant.is_active === false) return json(false, 404, { error: "Tenant not found" });

    // Narrow to a stable primitive so TS never complains inside closures
    const tenantId = tenant.id;

    const membershipRes = await supabase
      .from("memberships")
      .select("id, role")
      .eq("tenant_id", tenantId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (membershipRes.error) return json(false, 400, { error: membershipRes.error.message });

    const membership = membershipRes.data;
    const mRole = String(membership?.role || "");
    if (mRole !== "owner" && mRole !== "admin") return json(false, 403, { error: "Forbidden" });

    let payload: Payload;
    try {
      payload = (await req.json()) as Payload;
    } catch {
      return json(false, 400, { error: "Invalid JSON body" });
    }

    const selected = uniq(payload.selected_recommended ?? []);
    const custom = (payload.custom ?? []).filter((t) => String(t?.name || "").trim().length > 0);
    const ensureServiceDesk = payload.ensure_service_desk !== false;

    const desiredRecommended = RECOMMENDED_TEAMS.filter((t) => selected.includes(t.key));
    if (ensureServiceDesk && !desiredRecommended.some((t) => t.key === "service_desk")) {
      const sd = RECOMMENDED_TEAMS.find((t) => t.key === "service_desk");
      if (sd) desiredRecommended.unshift(sd);
    }

    const createdTeamIds: string[] = [];

    async function ensureTeam(opts: {
      key: string | null;
      name: string;
      modules: string[];
      is_default_triage?: boolean;
      role_scopes?: Partial<Record<RoleKey, ScopeKey[]>>;
    }) {
      const existing = await supabase
        .from("teams")
        .select("id")
        .eq("tenant_id", tenantId)
        .eq("name", opts.name)
        .maybeSingle();

      if (existing.error) throw new Error(existing.error.message);

      let teamId = existing.data?.id as string | undefined;

      if (!teamId) {
        const ins = await supabase
          .from("teams")
          .insert({
            tenant_id: tenantId,
            key: opts.key,
            name: opts.name,
            modules: opts.modules,
            is_default_triage: !!opts.is_default_triage,
          })
          .select("id")
          .single();

        if (ins.error) throw new Error(ins.error.message);
        teamId = (ins.data as any).id as string;
        createdTeamIds.push(teamId);
      }

      const defaults: Record<RoleKey, ScopeKey[]> = {
        viewer: DEFAULT_ROLE_SCOPES.viewer,
        agent: DEFAULT_ROLE_SCOPES.agent,
        lead: DEFAULT_ROLE_SCOPES.lead,
        admin: DEFAULT_ROLE_SCOPES.admin,
      };

      const overrides = opts.role_scopes ?? {};
      const final: Record<RoleKey, ScopeKey[]> = {
        viewer: overrides.viewer ?? defaults.viewer,
        agent: overrides.agent ?? defaults.agent,
        lead: overrides.lead ?? defaults.lead,
        admin: overrides.admin ?? defaults.admin,
      };

      for (const roleKey of Object.keys(final) as RoleKey[]) {
        const roleExisting = await supabase
          .from("team_roles")
          .select("id")
          .eq("team_id", teamId)
          .eq("role_key", roleKey)
          .maybeSingle();

        if (roleExisting.error) throw new Error(roleExisting.error.message);

        if (!roleExisting.data?.id) {
          const rIns = await supabase
            .from("team_roles")
            .insert({
              team_id: teamId,
              role_key: roleKey,
              role_name: roleKey.toUpperCase(),
              scopes: final[roleKey],
            })
            .select("id")
            .single();

          if (rIns.error) throw new Error(rIns.error.message);
        }
      }

      // Make current admin a Lead in Service Desk automatically
      if (opts.key === "service_desk" && membership?.id) {
        const leadRole = await supabase
          .from("team_roles")
          .select("id")
          .eq("team_id", teamId)
          .eq("role_key", "lead")
          .maybeSingle();

        if (leadRole.error) throw new Error(leadRole.error.message);

        if (leadRole.data?.id) {
          const already = await supabase
            .from("team_members")
            .select("id")
            .eq("team_id", teamId)
            .eq("membership_id", membership.id)
            .maybeSingle();

          if (already.error) throw new Error(already.error.message);

          if (!already.data?.id) {
            const add = await supabase.from("team_members").insert({
              team_id: teamId,
              membership_id: membership.id,
              team_role_id: leadRole.data.id,
            });
            if (add.error) throw new Error(add.error.message);
          }
        }
      }

      return teamId;
    }

    for (const t of desiredRecommended) {
      await ensureTeam({
        key: t.key,
        name: t.name,
        modules: [t.module],
        is_default_triage: t.key === "service_desk",
      });
    }

    for (const t of custom) {
      await ensureTeam({
        key: null,
        name: String(t.name).trim(),
        modules: (t.modules ?? ["itsm"]).slice(),
        role_scopes: t.role_scopes,
      });
    }

    return json(true, 200, { created_team_ids: createdTeamIds });
  } catch (e: any) {
    return json(false, 500, { error: e?.message || "Unknown error" });
  }
}
