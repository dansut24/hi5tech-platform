const BASE_URL = process.env.SOFTWARE_INTELLIGENCE_API_URL;

function headers() {
  return {
    "Content-Type": "application/json",
    "x-api-key": process.env.SOFTWARE_INTELLIGENCE_API_KEY || "",
    "x-hi5-shared-secret": process.env.SOFTWARE_INTELLIGENCE_SHARED_SECRET || ""
  };
}

export async function syncDeviceSoftwareInventory(payload: {
  externalDeviceId: string;
  hostname?: string;
  tenantId?: string;
  osName?: string;
  osVersion?: string;
  software: Array<{
    name: string;
    vendor?: string;
    version?: string;
    installLocation?: string;
    uninstallString?: string;
  }>;
}) {
  const res = await fetch(`${BASE_URL}/api/device/software-inventory`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify(payload)
  });

  return res.json();
}

export async function getPatchPlan(externalDeviceId: string) {
  const res = await fetch(
    `${BASE_URL}/api/device/patch-plan?externalDeviceId=${encodeURIComponent(
      externalDeviceId
    )}`,
    {
      cache: "no-store",
      headers: headers()
    }
  );

  return res.json();
}

export async function getPatchPlanCveRisks(
  items: Array<{
    name: string;
    vendor?: string;
    installedVersion?: string;
    matchedSoftwareId?: string | null;
    matchedWingetId?: string | null;
  }>
) {
  if (!BASE_URL || items.length === 0) {
    return {};
  }

  try {
    const res = await fetch(`${BASE_URL}/api/rmm/cve-risk`, {
      method: "POST",
      headers: headers(),
      cache: "no-store",
      body: JSON.stringify({ items })
    });

    if (!res.ok) {
      return {};
    }

    const json = await res.json();

    if (!json.ok) {
      return {};
    }

    return json.risks || {};
  } catch {
    return {};
  }
}

export function getPatchPlanRiskKey(item: {
  name: string;
  vendor?: string;
  matchedSoftwareId?: string | null;
  matchedWingetId?: string | null;
}) {
  return (
    item.matchedSoftwareId ||
    item.matchedWingetId ||
    `${item.vendor || ""}:${item.name || ""}`
  );
}

export async function createPatchTasks(externalDeviceId: string) {
  const res = await fetch(`${BASE_URL}/api/device/tasks/create`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify({ externalDeviceId })
  });

  return res.json();
}

export async function getPatchTasks(externalDeviceId: string) {
  const res = await fetch(
    `${BASE_URL}/api/device/tasks?externalDeviceId=${encodeURIComponent(
      externalDeviceId
    )}`,
    {
      cache: "no-store",
      headers: headers()
    }
  );

  return res.json();
}

export async function updatePatchPolicyAppDecision(input: {
  policyId: string;
  wingetId: string;
  decision: "allow" | "manual" | "block" | "unlisted";
}) {
  const res = await fetch(`${BASE_URL}/api/policies/apps`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify(input)
  });

  return res.json();
}
