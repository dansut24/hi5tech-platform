export const RMM_API_BASE = (
  process.env.NEXT_PUBLIC_RMM_API_BASE ||
  process.env.RMM_API_BASE ||
  "https://rmm.hi5tech.co.uk"
).replace(/\/+$/, "");

export function controlServerHeaders(extra?: HeadersInit): HeadersInit {
  const secret = process.env.RMM_PLATFORM_SHARED_SECRET || process.env.CONTROL_SERVER_SHARED_SECRET || "";

  return {
    "Content-Type": "application/json",
    ...(secret ? { "X-Hi5-Platform-Secret": secret } : {}),
    ...(extra ?? {}),
  };
}

export async function controlServerJson<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${RMM_API_BASE}${path.startsWith("/") ? path : `/${path}`}`, {
    cache: "no-store",
    ...init,
    headers: controlServerHeaders(init?.headers),
  });

  const json = await res.json().catch(() => null);

  if (!res.ok) {
    const message = json?.error || json?.message || `Control server request failed (${res.status})`;
    throw new Error(message);
  }

  return json as T;
}
