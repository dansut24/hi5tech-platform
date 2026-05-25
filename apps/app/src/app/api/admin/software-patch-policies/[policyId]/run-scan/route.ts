import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

function asArray(value: any): any[] {
  return Array.isArray(value) ? value : [];
}

function normalise(value: any) {
  return String(value || "").trim().toLowerCase();
}

function isSelectedSoftware(item: any, allowedWingetIds: Set<string>) {
  const wingetId = String(item.matchedWingetId || "").trim();
  return Boolean(wingetId && allowedWingetIds.has(wingetId));
}

function buildDefaultWingetFallback(item: any) {
  const wingetId = item.matchedWingetId || item.source?.packageId || "";

  if (!wingetId) return null;

  const command = `winget upgrade --id ${wingetId} --silent --accept-package-agreements --accept-source-agreements`;

  return {
    sourceType: "winget",
    sourceName: "WinGet fallback",
    trusted: true,
    verified: true,
    sourcePriority: 10,
    reliabilityScore: 75,
    fallbackOrder: 3,
    requiresPackageManager: true,
    packageManager: "winget",
    packageId: wingetId,
    version: item.latestVersion || "",
    command,
    execution: {
      executionType: "winget",
      command,
      installCommand: command,
      downloadUrl: "",
      localFileName: "",
      verifySha256: "",
      requiresDownload: false,
      sourcePriority: 10,
      reliabilityScore: 75,
      fallbackOrder: 3,
      requiresPackageManager: true,
      packageManager: "winget"
    }
  };
}

function buildExecutionPayload(item: any) {
  const source = item.source || {};
  const execution = source.execution || {};
  const fallbackSource = source.fallbackSource || buildDefaultWingetFallback(item);

  return {
    ...execution,
    sourceType: source.sourceType || "",
    sourceName: source.sourceName || "",
    packageSource: item.patchPackage?.packageSource || source.sourceType || "",
    packageName: item.patchPackage?.packageName || source.sourceName || "",
    packageVersion: item.patchPackage?.version || source.version || item.latestVersion || "",
    wingetId: item.matchedWingetId || source.packageId || "",
    sourcePriority: source.sourcePriority ?? execution.sourcePriority ?? 100,
    reliabilityScore: source.reliabilityScore ?? execution.reliabilityScore ?? 50,
    fallbackOrder: source.fallbackOrder ?? execution.fallbackOrder ?? 100,
    requiresPackageManager: Boolean(
      source.requiresPackageManager ?? execution.requiresPackageManager
    ),
    packageManager: source.packageManager || execution.packageManager || null,
    fallbackSource,
    fallbackPackages: asArray(source.fallbackPackages || item.patchPackage?.fallbackPackages)
  };
}

function buildScheduledFor(policy: any, body: any) {
  const explicit =
    body.scheduledFor ||
    body.scheduled_for ||
    body.patchAt ||
    body.patch_at;

  if (explicit) {
    return new Date(explicit).toISOString();
  }

  const patchSchedule = policy?.patch_schedule || {};
  const time = String(patchSchedule.time || "15:00");
  const [hours, minutes] = time.split(":").map((part: string) => Number(part));

  const scheduled = new Date();
  scheduled.setHours(Number.isFinite(hours) ? hours : 15);
  scheduled.setMinutes(Number.isFinite(minutes) ? minutes : 0);
  scheduled.setSeconds(0);
  scheduled.setMilliseconds(0);

  if (scheduled.getTime() < Date.now()) {
    scheduled.setDate(scheduled.getDate() + 1);
  }

  return scheduled.toISOString();
}

async function fetchPatchPlan(origin: string, deviceId: string, tenantId: string) {
  const res = await fetch(
    `${origin}/api/admin/devices/${encodeURIComponent(deviceId)}/patch-plan?tenant_id=${encodeURIComponent(tenantId)}`,
    { cache: "no-store" }
  );

  if (!res.ok) {
    throw new Error(`Patch plan failed for ${deviceId}: ${res.status}`);
  }

  return res.json();
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ policyId: string }> }
) {
  const { policyId } = await context.params;

  return NextResponse.json({
    ok: true,
    message: "Software patch policy scan endpoint is online. Use POST to scan policy targets and queue scheduled patch jobs.",
    policyId
  });
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ policyId: string }> }
) {
  try {
    const { policyId } = await context.params;
    const body = await request.json().catch(() => ({}));
    const origin = new URL(request.url).origin;

    const admin = supabaseAdmin();

    const { data: policy, error: policyError } = await admin
      .from("software_patch_policies")
      .select(
        `
        *,
        items:software_patch_policy_items(*),
        targets:software_patch_policy_targets(*)
      `
      )
      .eq("id", policyId)
      .single();

    if (policyError) throw policyError;

    if (!policy?.enabled) {
      return NextResponse.json(
        { ok: false, error: "Software patch policy is disabled" },
        { status: 400 }
      );
    }

    const tenantId =
      body.tenantId ||
      body.tenant_id ||
      policy.tenant_id;

    const enabledItems = asArray(policy.items).filter((item: any) => item.enabled);
    const targets = asArray(policy.targets);

    const allowedWingetIds = new Set(
      enabledItems
        .map((item: any) => String(item.winget_id || "").trim())
        .filter(Boolean)
    );

    const deviceTargets = targets.filter(
      (target: any) => normalise(target.target_type) === "device"
    );

    const scheduledFor = buildScheduledFor(policy, body);

    const { data: run, error: runError } = await admin
      .from("software_patch_policy_runs")
      .insert({
        policy_id: policy.id,
        tenant_id: tenantId,
        run_type: "scan",
        status: "running",
        device_count: deviceTargets.length,
        job_count: 0,
        started_at: new Date().toISOString()
      })
      .select("*")
      .single();

    if (runError) throw runError;

    let jobCount = 0;
    const deviceResults: any[] = [];

    for (const target of deviceTargets) {
      const deviceId = target.target_id;

      try {
        const patchPlan = await fetchPatchPlan(origin, deviceId, tenantId);
        const planItems = asArray(patchPlan.items);

        const approvedItems = planItems.filter(
          (item: any) =>
            item.updateAvailable &&
            item.approved &&
            item.source?.execution?.command &&
            isSelectedSoftware(item, allowedWingetIds)
        );

        if (approvedItems.length === 0) {
          deviceResults.push({
            deviceId,
            status: "no_matching_updates",
            queued: 0
          });
          continue;
        }

        const { data: job, error: jobError } = await admin
          .from("patch_jobs")
          .insert({
            tenant_id: tenantId,
            device_id: deviceId,
            policy_id: policy.id,
            policy_run_id: run.id,
            status: "scheduled",
            approved_count: approvedItems.length,
            total_count: approvedItems.length,
            scheduled_for: scheduledFor,
            offline_status: "waiting_for_device"
          })
          .select("*")
          .single();

        if (jobError) throw jobError;

        const rows = approvedItems.map((item: any) => {
          const execution = buildExecutionPayload(item);

          return {
            job_id: job.id,
            device_id: deviceId,
            software_name: item.name,
            vendor: item.vendor || "",
            installed_version: item.installedVersion || "",
            target_version: item.latestVersion || "",
            winget_id: item.matchedWingetId || execution.wingetId || "",
            command: execution.command || "",
            execution,
            status: "scheduled"
          };
        });

        const { error: itemsError } = await admin
          .from("patch_job_items")
          .insert(rows);

        if (itemsError) throw itemsError;

        jobCount += 1;

        deviceResults.push({
          deviceId,
          status: "scheduled",
          jobId: job.id,
          queued: rows.length,
          scheduledFor
        });
      } catch (error: any) {
        deviceResults.push({
          deviceId,
          status: "failed",
          error: error.message || "Failed to scan device"
        });
      }
    }

    const finalStatus = deviceResults.some((result) => result.status === "failed")
      ? "completed_with_errors"
      : "completed";

    const { error: updateRunError } = await admin
      .from("software_patch_policy_runs")
      .update({
        status: finalStatus,
        job_count: jobCount,
        finished_at: new Date().toISOString()
      })
      .eq("id", run.id);

    if (updateRunError) throw updateRunError;

    return NextResponse.json({
      ok: true,
      policyId: policy.id,
      policyRunId: run.id,
      tenantId,
      scheduledFor,
      deviceCount: deviceTargets.length,
      jobCount,
      results: deviceResults
    });
  } catch (error: any) {
    return NextResponse.json(
      { ok: false, error: error.message || "Failed to run software patch policy scan" },
      { status: 500 }
    );
  }
}
