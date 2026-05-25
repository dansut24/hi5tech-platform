import { NextRequest, NextResponse } from "next/server";
import {
  getPatchPlan,
  getPatchPlanCveRisks,
  getPatchPlanRiskKey,
  syncDeviceSoftwareInventory
} from "@/lib/software-intelligence/client";
import { lookupPatchPackages } from "@/lib/software-intelligence-client";
import { getPatchRiskPriority } from "@/lib/patch-risk-policy";
import { supabaseAdmin } from "@/lib/supabase/admin";

function asArray(value: any): any[] {
  return Array.isArray(value) ? value : [];
}

function firstValue(source: any, keys: string[], fallback: any = "") {
  for (const key of keys) {
    const value = source?.[key];

    if (value !== undefined && value !== null && value !== "") {
      return value;
    }
  }

  return fallback;
}

function normalise(value: any) {
  return String(value || "").trim().toLowerCase();
}

function ruleMatches(rule: any, row: any) {
  const name = normalise(row.name);
  const vendor = normalise(row.vendor);
  const matchValue = normalise(rule.match_value);
  const vendorMatch = normalise(rule.vendor_match);

  if (vendorMatch && !vendor.includes(vendorMatch)) return false;
  if (rule.match_type === "exact") return name === matchValue;
  if (rule.match_type === "contains") return name.includes(matchValue);

  if (rule.match_type === "regex") {
    try {
      return new RegExp(rule.match_value, "i").test(row.name || "");
    } catch {
      return false;
    }
  }

  return false;
}

const defaultInventoryRules = [
  [
    "ignore",
    "contains",
    "Microsoft .NET Framework 4.8.1 SDK",
    "Microsoft Corporation",
    "",
    "",
    "",
    "Developer/runtime component managed by Visual Studio or Windows"
  ],
  [
    "ignore",
    "contains",
    "Microsoft .NET Framework 4.8.1 Targeting Pack",
    "Microsoft Corporation",
    "",
    "",
    "",
    "Developer targeting pack, not a normal patchable app"
  ],
  [
    "ignore",
    "exact",
    "Python Launcher",
    "Python Software Foundation",
    "",
    "",
    "",
    "Python launcher helper component, not independently patched"
  ],
  [
    "ignore",
    "exact",
    "vs_CoreEditorFonts",
    "Microsoft Corporation",
    "",
    "",
    "",
    "Visual Studio component"
  ],
  [
    "ignore",
    "exact",
    "Windows SDK AddOn",
    "Microsoft Corporation",
    "",
    "",
    "",
    "Windows SDK component"
  ],
  [
    "ignore",
    "contains",
    "Windows Software Development Kit",
    "Microsoft Corporation",
    "",
    "",
    "",
    "Windows SDK component"
  ],
  [
    "alias",
    "exact",
    "QEMU",
    "QEMU Community",
    "QEMU",
    "QEMU Community",
    "SoftwareFreedomConservancy.QEMU",
    "Map installed QEMU display name to WinGet package"
  ],
  [
    "alias",
    "contains",
    "VMware Workstation",
    "VMware, Inc.",
    "VMware Workstation Pro",
    "VMware, Inc.",
    "VMware.WorkstationPro",
    "Map VMware Workstation display name to WinGet package"
  ],
  [
    "ignore",
    "exact",
    "Microsoft Visual Studio Installer",
    "Microsoft Corporation",
    "",
    "",
    "",
    "Managed by Visual Studio Installer rather than normal app patching"
  ]
].map((rule, index) => ({
  id: `default-${index}`,
  rule_type: rule[0],
  match_type: rule[1],
  match_value: rule[2],
  vendor_match: rule[3],
  target_name: rule[4],
  target_vendor: rule[5],
  target_winget_id: rule[6],
  reason: rule[7],
  enabled: true
}));

async function loadInventoryRules(admin: any) {
  const { data, error } = await admin
    .from("software_inventory_rules")
    .select("*")
    .eq("enabled", true)
    .order("created_at", { ascending: true });

  if (error) throw error;

  return data && data.length > 0 ? data : defaultInventoryRules;
}

function applyInventoryRules(rows: any[], rules: any[]) {
  const patchableRows: any[] = [];
  const ignoredRows: any[] = [];

  for (const row of rows) {
    const matchingRule = rules.find((rule) => ruleMatches(rule, row));

    if (!matchingRule) {
      patchableRows.push(row);
      continue;
    }

    if (matchingRule.rule_type === "ignore") {
      ignoredRows.push({
        name: row.name,
        vendor: row.vendor,
        installedVersion: row.version,
        matchedSoftwareId: null,
        matchedWingetId: "",
        matchConfidence: 0,
        latestVersion: "",
        updateAvailable: false,
        riskSeverity: "None",
        cvssScore: 0,
        knownExploited: false,
        source: {
          sourceType: "inventory_rule",
          sourceName: "Inventory rule",
          trusted: true,
          verified: true,
          sourcePriority: 100,
          reliabilityScore: 50,
          fallbackOrder: 100,
          requiresPackageManager: false,
          packageManager: null,
          command: "",
          downloadUrl: "",
          packageUrl: "",
          fallbackPackages: [],
          execution: {
            executionType: "none",
            command: "",
            downloadUrl: "",
            localFileName: "",
            installCommand: "",
            verifySha256: "",
            requiresDownload: false,
            sourcePriority: 100,
            reliabilityScore: 50,
            fallbackOrder: 100,
            requiresPackageManager: false,
            packageManager: null
          }
        },
        command: "",
        policyDecision: "not_applicable",
        recommendedAction: "none",
        approved: false,
        reason: matchingRule.reason || "Ignored by software inventory rule",
        cveCount: 0,
        affectedCves: [],
        riskPriority: "none",
        riskLabel: "Managed component",
        riskReason: matchingRule.reason || "Ignored by software inventory rule",
        inventoryRule: {
          id: matchingRule.id,
          ruleType: matchingRule.rule_type,
          reason: matchingRule.reason || ""
        }
      });

      continue;
    }

    if (matchingRule.rule_type === "alias") {
      patchableRows.push({
        ...row,
        name: matchingRule.target_name || row.name,
        vendor: matchingRule.target_vendor || row.vendor,
        wingetId: matchingRule.target_winget_id || row.wingetId || "",
        inventoryAlias: {
          originalName: row.name,
          originalVendor: row.vendor,
          targetWingetId: matchingRule.target_winget_id || "",
          reason: matchingRule.reason || ""
        }
      });

      continue;
    }

    patchableRows.push(row);
  }

  return { patchableRows, ignoredRows };
}

function extractSoftwareRows(inventory: any) {
  const software = inventory?.software ?? inventory?.software_summary ?? {};

  const rows =
    asArray(software?.items).length > 0
      ? asArray(software.items)
      : asArray(software?.apps).length > 0
        ? asArray(software.apps)
        : asArray(software?.installed);

  return rows
    .map((row: any) => ({
      name: firstValue(row, ["name", "display_name", "displayName"]),
      vendor: firstValue(row, ["vendor", "publisher", "manufacturer"]),
      version: firstValue(row, ["version", "display_version", "displayVersion"]),
      wingetId: firstValue(row, ["winget_id", "wingetId", "package_id", "packageId"]),
      installLocation: firstValue(row, ["install_location", "installLocation", "path"]),
      uninstallString: firstValue(row, [
        "quiet_uninstall_string",
        "uninstall_string",
        "uninstallString"
      ])
    }))
    .filter((row: any) => row.name);
}

function extractHostname(inventory: any, deviceId: string) {
  return firstValue(
    inventory?.summary,
    ["hostname", "computer_name", "device_name", "name"],
    deviceId
  );
}

function extractOsName(inventory: any) {
  return firstValue(inventory?.os, ["name", "caption", "product_name"], "");
}

function extractOsVersion(inventory: any) {
  return firstValue(inventory?.os, ["version", "display_version", "build"], "");
}

function uniqueStrings(values: any[]) {
  return Array.from(
    new Set(values.map((value) => String(value || "").trim()).filter(Boolean))
  );
}

function buildSourceFromPatchPackage(patchPackage: any, fallbackSource: any) {
  if (!patchPackage) {
    return fallbackSource;
  }

  const command =
    patchPackage.command ||
    patchPackage.upgradeCommand ||
    patchPackage.installCommand ||
    "";

  const sourcePriority = patchPackage.sourcePriority ?? 100;
  const reliabilityScore = patchPackage.reliabilityScore ?? 50;
  const fallbackOrder = patchPackage.fallbackOrder ?? 100;
  const requiresPackageManager = Boolean(patchPackage.requiresPackageManager);
  const packageManager = patchPackage.packageManager || null;

  const fallbackPackages = asArray(patchPackage.fallbackPackages).map(
    (fallback: any) => buildSourceFromPatchPackage(fallback, null)
  );

  return {
    sourceType: patchPackage.packageSource || "software_intelligence",
    sourceName:
      patchPackage.packageName ||
      patchPackage.packageSource ||
      "Software Intelligence",
    trusted: Boolean(patchPackage.trusted),
    verified: Boolean(patchPackage.verified),
    priority: patchPackage.verified ? 1 : 10,
    sourcePriority,
    reliabilityScore,
    fallbackOrder,
    requiresPackageManager,
    packageManager,
    packageId: patchPackage.wingetId || "",
    version: patchPackage.version || "",
    installerType: patchPackage.installerType || "",
    architecture: patchPackage.architecture || "",
    downloadUrl: patchPackage.downloadUrl || "",
    packageUrl: patchPackage.packageUrl || "",
    installerSha256: patchPackage.installerSha256 || "",
    signatureSubject: patchPackage.signatureSubject || "",
    command,
    execution: {
      executionType: patchPackage.executionType || "winget",
      command,
      downloadUrl: patchPackage.downloadUrl || "",
      localFileName: "",
      installCommand:
        patchPackage.upgradeCommand ||
        patchPackage.installCommand ||
        command,
      verifySha256: patchPackage.installerSha256 || "",
      requiresDownload: Boolean(patchPackage.downloadUrl),
      sourcePriority,
      reliabilityScore,
      fallbackOrder,
      requiresPackageManager,
      packageManager
    },
    fallbackSource,
    fallbackPackages
  };
}

async function enrichPatchPlanWithPatchPackages(items: any[]) {
  const wingetIds = uniqueStrings(items.map((item: any) => item.matchedWingetId));

  if (wingetIds.length === 0) {
    return items;
  }

  const patchPackages = await lookupPatchPackages(wingetIds);

  return items.map((item: any) => {
    const patchPackage = patchPackages.get(item.matchedWingetId);

    if (!patchPackage) {
      return item;
    }

    const source = buildSourceFromPatchPackage(patchPackage, item.source);

    return {
      ...item,
      latestVersion: source.version || item.latestVersion,
      source,
      command: source.command || item.command || "",
      patchPackage: {
        packageSource: patchPackage.packageSource,
        packageName: patchPackage.packageName,
        wingetId: patchPackage.wingetId,
        version: patchPackage.version,
        executionType: patchPackage.executionType,
        trusted: patchPackage.trusted,
        verified: patchPackage.verified,
        sourcePriority: patchPackage.sourcePriority ?? 100,
        reliabilityScore: patchPackage.reliabilityScore ?? 50,
        fallbackOrder: patchPackage.fallbackOrder ?? 100,
        requiresPackageManager: Boolean(patchPackage.requiresPackageManager),
        packageManager: patchPackage.packageManager || null,
        fallbackPackages: patchPackage.fallbackPackages || []
      }
    };
  });
}

async function enrichPatchPlanWithCveRisk(items: any[]) {
  const cveRisks = await getPatchPlanCveRisks(
    items.map((item: any) => ({
      name: item.name,
      vendor: item.vendor,
      installedVersion: item.installedVersion,
      matchedSoftwareId: item.matchedSoftwareId,
      matchedWingetId: item.matchedWingetId
    }))
  );

  return items.map((item: any) => {
    const risk = cveRisks[getPatchPlanRiskKey(item)];

    const enrichedItem = risk
      ? {
          ...item,
          riskSeverity: risk.riskSeverity || item.riskSeverity || "None",
          cvssScore: Number(risk.cvssScore || item.cvssScore || 0),
          knownExploited: Boolean(risk.knownExploited || item.knownExploited),
          cveCount: Number(risk.cveCount || 0),
          affectedCves: risk.affectedCves || []
        }
      : {
          ...item,
          cveCount: Number(item.cveCount || 0),
          affectedCves: item.affectedCves || []
        };

    const priority = getPatchRiskPriority(enrichedItem);

    return {
      ...enrichedItem,
      riskPriority: priority.priority,
      riskLabel: item.riskLabel || priority.label,
      riskReason: item.riskReason || priority.reason
    };
  });
}

function mergeIgnoredRows(items: any[], ignoredRows: any[]) {
  if (ignoredRows.length === 0) {
    return items;
  }

  const existingKeys = new Set(
    items.map((item: any) =>
      `${normalise(item.name)}|${normalise(item.vendor)}|${normalise(item.installedVersion)}`
    )
  );

  const uniqueIgnored = ignoredRows.filter((item: any) => {
    const key = `${normalise(item.name)}|${normalise(item.vendor)}|${normalise(item.installedVersion)}`;
    return !existingKeys.has(key);
  });

  return [...items, ...uniqueIgnored];
}

function applyAliasMetadataToPlanItems(items: any[], patchableRows: any[]) {
  const aliasByWinget = new Map(
    patchableRows
      .filter((row: any) => row.inventoryAlias?.targetWingetId)
      .map((row: any) => [row.inventoryAlias.targetWingetId, row.inventoryAlias])
  );

  if (aliasByWinget.size === 0) {
    return items;
  }

  return items.map((item: any) => {
    const alias = aliasByWinget.get(item.matchedWingetId);

    if (!alias) {
      return item;
    }

    return {
      ...item,
      inventoryAlias: alias,
      reason: item.reason || alias.reason
    };
  });
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ deviceId: string }> }
) {
  try {
    const { deviceId } = await context.params;
    const url = new URL(request.url);
    const tenantId = url.searchParams.get("tenant_id") || "demo";

    const admin = supabaseAdmin();

    const { data: inventory } = await admin
      .from("device_inventory")
      .select("summary, os, software, software_summary")
      .eq("device_id", deviceId)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const rawSoftware = extractSoftwareRows(inventory);
    const inventoryRules = await loadInventoryRules(admin);
    const { patchableRows, ignoredRows } = applyInventoryRules(
      rawSoftware,
      inventoryRules
    );

    if (patchableRows.length > 0) {
      await syncDeviceSoftwareInventory({
        externalDeviceId: deviceId,
        hostname: extractHostname(inventory, deviceId),
        tenantId,
        osName: extractOsName(inventory),
        osVersion: extractOsVersion(inventory),
        software: patchableRows
      });
    }

    const data = await getPatchPlan(deviceId);
    const items = asArray(data?.items);

    const aliasedItems = applyAliasMetadataToPlanItems(items, patchableRows);
    const withIgnoredRows = mergeIgnoredRows(aliasedItems, ignoredRows);
    const packageEnrichedItems =
      await enrichPatchPlanWithPatchPackages(withIgnoredRows);
    const enrichedItems = await enrichPatchPlanWithCveRisk(packageEnrichedItems);

    const criticalCount = enrichedItems.filter((item: any) =>
      ["urgent", "critical"].includes(item.riskPriority)
    ).length;

    const updateCount = enrichedItems.filter((item: any) => item.updateAvailable).length;
    const approvedCount = enrichedItems.filter(
      (item: any) => item.approved && item.updateAvailable
    ).length;
    const requiresApprovalCount = enrichedItems.filter(
      (item: any) =>
        item.updateAvailable &&
        !item.approved &&
        String(item.policyDecision || "").toLowerCase().includes("approval")
    ).length;

    return NextResponse.json({
      ...data,
      items: enrichedItems,
      itemCount: enrichedItems.length,
      updateCount,
      approvedCount,
      requiresApprovalCount,
      criticalCount,
      inventoryRulesApplied: inventoryRules.length,
      ignoredInventoryCount: ignoredRows.length,
      rmmInventorySynced: patchableRows.length,
      rmmRawInventoryCount: rawSoftware.length,
      rmmDeviceId: deviceId
    });
  } catch (error: any) {
    return NextResponse.json(
      { ok: false, error: error.message || "Failed to get patch plan" },
      { status: 500 }
    );
  }
}
