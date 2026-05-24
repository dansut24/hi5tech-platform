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
    new Set(
      values
        .map((value) => String(value || "").trim())
        .filter(Boolean)
    )
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

  return {
    sourceType: patchPackage.packageSource || "software_intelligence",
    sourceName:
      patchPackage.packageName ||
      patchPackage.packageSource ||
      "Software Intelligence",
    trusted: Boolean(patchPackage.trusted),
    verified: Boolean(patchPackage.verified),
    priority: patchPackage.verified ? 1 : 10,
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
      requiresDownload: Boolean(patchPackage.downloadUrl)
    },
    fallbackSource
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
        verified: patchPackage.verified
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
      riskLabel: priority.label,
      riskReason: priority.reason
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

    const software = extractSoftwareRows(inventory);

    if (software.length > 0) {
      await syncDeviceSoftwareInventory({
        externalDeviceId: deviceId,
        hostname: extractHostname(inventory, deviceId),
        tenantId,
        osName: extractOsName(inventory),
        osVersion: extractOsVersion(inventory),
        software
      });
    }

    const data = await getPatchPlan(deviceId);
    const items = asArray(data?.items);

    const packageEnrichedItems = await enrichPatchPlanWithPatchPackages(items);
    const enrichedItems = await enrichPatchPlanWithCveRisk(packageEnrichedItems);

    const criticalCount = enrichedItems.filter((item: any) =>
      ["urgent", "critical"].includes(item.riskPriority)
    ).length;

    return NextResponse.json({
      ...data,
      items: enrichedItems,
      criticalCount,
      rmmInventorySynced: software.length,
      rmmDeviceId: deviceId
    });
  } catch (error: any) {
    return NextResponse.json(
      { ok: false, error: error.message || "Failed to get patch plan" },
      { status: 500 }
    );
  }
}
