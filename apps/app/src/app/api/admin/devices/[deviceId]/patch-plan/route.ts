import { NextRequest, NextResponse } from "next/server";
import {
  getPatchPlan,
  getPatchPlanCveRisks,
  getPatchPlanRiskKey,
  syncDeviceSoftwareInventory
} from "@/lib/software-intelligence/client";
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
    const enrichedItems = await enrichPatchPlanWithCveRisk(items);

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
