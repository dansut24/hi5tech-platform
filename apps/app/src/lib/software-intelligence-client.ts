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

  sourcePriority: number;
  reliabilityScore: number;
  fallbackOrder: number;
  requiresPackageManager: boolean;
  packageManager: string | null;

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
    if (!item.wingetId) continue;

    map.set(item.wingetId, {
      softwareId: item.softwareId,
      wingetId: item.wingetId,
      packageSource: item.packageSource,
      packageName: item.packageName,
      version: item.version,
      installerType: item.installerType,
      architecture: item.architecture,
      downloadUrl: item.downloadUrl,
      packageUrl: item.packageUrl,
      installerSha256: item.installerSha256,
      signatureSubject: item.signatureSubject,
      command: item.command,
      installCommand: item.installCommand,
      upgradeCommand: item.upgradeCommand,
      uninstallCommand: item.uninstallCommand,
      executionType: item.executionType,
      trusted: Boolean(item.trusted),
      verified: Boolean(item.verified),

      sourcePriority: item.sourcePriority ?? 100,
      reliabilityScore: item.reliabilityScore ?? 50,
      fallbackOrder: item.fallbackOrder ?? 100,
      requiresPackageManager: Boolean(item.requiresPackageManager),
      packageManager: item.packageManager || null,

      metadata: item.metadata || {}
    });
  }

  return map;
}
