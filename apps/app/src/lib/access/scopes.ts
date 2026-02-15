// apps/app/src/lib/access/scopes.ts

export type ModuleKey = "itsm" | "control" | "selfservice" | "admin";

export type ScopeKey =
  // ITSM
  | "itsm:tickets:read_all"
  | "itsm:tickets:triage_assign"
  | "itsm:tickets:update_status"
  | "itsm:tickets:comment_internal"
  | "itsm:teams:manage"
  // Control (RMM)
  | "control:devices:read"
  | "control:devices:actions"
  | "control:remote:open"
  | "control:scripts:run"
  // Self service
  | "portal:tickets:create"
  | "portal:tickets:read"
  | "portal:tickets:comment";

export type ScopeDef = {
  key: ScopeKey;
  module: ModuleKey;
  group: string;
  label: string;
  description?: string;
};

export const SCOPES: ScopeDef[] = [
  // ITSM
  {
    key: "itsm:tickets:read_all",
    module: "itsm",
    group: "Tickets",
    label: "Read all tickets (tenant)",
    description: "View any ticket in the tenant (not just assigned/team)",
  },
  {
    key: "itsm:tickets:triage_assign",
    module: "itsm",
    group: "Tickets",
    label: "Triage & assign",
    description: "Assign/reassign tickets (team/user)",
  },
  { key: "itsm:tickets:update_status", module: "itsm", group: "Tickets", label: "Update status" },
  {
    key: "itsm:tickets:comment_internal",
    module: "itsm",
    group: "Tickets",
    label: "Internal comments",
    description: "Add internal notes not visible to requesters",
  },
  {
    key: "itsm:teams:manage",
    module: "itsm",
    group: "Administration",
    label: "Manage teams",
    description: "Create/edit teams, roles and membership",
  },

  // Control (RMM)
  { key: "control:devices:read", module: "control", group: "Devices", label: "Read devices" },
  {
    key: "control:devices:actions",
    module: "control",
    group: "Devices",
    label: "Run actions",
    description: "Run device actions (restart service, install, etc.)",
  },
  { key: "control:remote:open", module: "control", group: "Remote", label: "Open remote session" },
  { key: "control:scripts:run", module: "control", group: "Automation", label: "Run scripts" },

  // Self service
  { key: "portal:tickets:create", module: "selfservice", group: "Tickets", label: "Raise tickets" },
  { key: "portal:tickets:read", module: "selfservice", group: "Tickets", label: "Read own tickets" },
  { key: "portal:tickets:comment", module: "selfservice", group: "Tickets", label: "Comment on tickets" },
];

export type RoleKey = "viewer" | "agent" | "lead" | "admin";

/** Default role→scopes presets (can be customized per-team in Admin). */
export const DEFAULT_ROLE_SCOPES: Record<RoleKey, ScopeKey[]> = {
  viewer: ["itsm:tickets:read_all"],
  agent: ["itsm:tickets:read_all", "itsm:tickets:update_status", "itsm:tickets:comment_internal"],
  lead: [
    "itsm:tickets:read_all",
    "itsm:tickets:triage_assign",
    "itsm:tickets:update_status",
    "itsm:tickets:comment_internal",
  ],
  admin: [
    "itsm:tickets:read_all",
    "itsm:tickets:triage_assign",
    "itsm:tickets:update_status",
    "itsm:tickets:comment_internal",
    "itsm:teams:manage",
  ],
};

export type RecommendedTeamKey =
  | "service_desk"
  | "it_support"
  | "networks"
  | "security"
  | "endpoint"
  | "infrastructure"
  | "apps"
  | "cab";

export const RECOMMENDED_TEAMS: Array<{ key: RecommendedTeamKey; name: string; module: ModuleKey }> = [
  { key: "service_desk", name: "Service Desk", module: "itsm" },
  { key: "it_support", name: "IT Support", module: "itsm" },
  { key: "networks", name: "Networks", module: "itsm" },
  { key: "security", name: "Security", module: "itsm" },
  { key: "endpoint", name: "Endpoint / EUC", module: "itsm" },
  { key: "infrastructure", name: "Infrastructure", module: "itsm" },
  { key: "apps", name: "Apps / Software", module: "itsm" },
  { key: "cab", name: "Change Advisory Board (CAB)", module: "itsm" },
];

export function scopeGroupsForModule(module: ModuleKey) {
  const defs = SCOPES.filter((s) => s.module === module);
  const groups = new Map<string, ScopeDef[]>();
  for (const d of defs) {
    const arr = groups.get(d.group) ?? [];
    arr.push(d);
    groups.set(d.group, arr);
  }
  return Array.from(groups.entries()).map(([group, items]) => ({ group, items }));
}
