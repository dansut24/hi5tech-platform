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

// ✅ IMPORTANT:
// Do NOT export server-only helpers from here.
// This file is imported by middleware (Edge).
