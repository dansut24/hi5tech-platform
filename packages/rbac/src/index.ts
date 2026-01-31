export type ModuleKey = "itsm" | "control" | "selfservice" | "admin";

export const MODULE_PATH: Record<ModuleKey, string> = {
  itsm: "/itsm",
  control: "/control",
  selfservice: "/selfservice",
  admin: "/admin",
};

export function pickDefaultModule(modules: ModuleKey[]): ModuleKey {
  const order: ModuleKey[] = ["itsm", "control", "selfservice", "admin"];
  for (const m of order) if (modules.includes(m)) return m;
  return modules[0] ?? "selfservice";
}

// ✅ IMPORTANT: export your function from the package entrypoint
export { getMemberTenantIds } from "./get-member-tenant-ids";
