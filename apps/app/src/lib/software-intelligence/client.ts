const BASE_URL = process.env.SOFTWARE_INTELLIGENCE_API_URL;

function headers() {
  return {
    "Content-Type": "application/json",
    "x-api-key": process.env.SOFTWARE_INTELLIGENCE_API_KEY || ""
  };
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
