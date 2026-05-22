const BASE_URL = process.env.SOFTWARE_INTELLIGENCE_API_URL;

function headers() {
  return {
    "Content-Type": "application/json",
    "x-api-key": process.env.SOFTWARE_INTELLIGENCE_API_KEY || ""
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
