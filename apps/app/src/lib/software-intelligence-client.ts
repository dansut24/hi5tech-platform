export type PatchPackage = {
  softwareId: string;
  wingetId: string;
  packageSource: string;
  packageName: string;
  version: string;
  installerType: string;
  architecture: string;
  downloadUrl: string;
  packageUrl: string;
  installerSha256: string | null;
  signatureSubject: string | null;
  command: string;
  installCommand: string;
  upgradeCommand: string;
  uninstallCommand: string | null;
  executionType: string;
  trusted: boolean;
  verified: boolean;
  metadata: Record<string, unknown>;
};

export async function lookupPatchPackages(wingetIds: string[]) {
  const baseUrl = process.env.SOFTWARE_INTELLIGENCE_URL;

  if (!baseUrl || wingetIds.length === 0) {
    return new Map<string, PatchPackage>();
  }

  const res = await fetch(`${baseUrl}/api/patch-packages/lookup`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    cache: "no-store",
    body: JSON.stringify({ wingetIds })
  });

  if (!res.ok) {
    return new Map<string, PatchPackage>();
  }

  const json = await res.json();

  const map = new Map<string, PatchPackage>();

  for (const item of json.packages || []) {
    if (item.wingetId) map.set(item.wingetId, item);
  }

  return map;
}
