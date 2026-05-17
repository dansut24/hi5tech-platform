// apps/app/src/lib/tenant/custom-domains.ts

export const CUSTOM_DOMAIN_DNS_TARGET =
  process.env.NEXT_PUBLIC_CUSTOM_DOMAIN_DNS_TARGET || "cname.vercel-dns.com";

export function normaliseCustomDomain(input: unknown) {
  let value = String(input ?? "").trim().toLowerCase();

  value = value
    .replace(/^https?:\/\//, "")
    .replace(/^www\./, "")
    .split("/")[0]
    .split(":")[0]
    .trim();

  return value;
}

export function isValidCustomDomain(domain: string) {
  const clean = normaliseCustomDomain(domain);

  if (!clean) return false;
  if (clean.includes("..")) return false;
  if (!clean.includes(".")) return false;
  if (clean.endsWith(".")) return false;
  if (clean.length > 253) return false;

  const labels = clean.split(".");

  return labels.every((label) => {
    if (!label) return false;
    if (label.length > 63) return false;
    if (label.startsWith("-") || label.endsWith("-")) return false;
    return /^[a-z0-9-]+$/.test(label);
  });
}

export function customDomainVerificationRecord(domain: string, token: string) {
  return {
    type: "TXT",
    name: `_hi5tech-verify.${normaliseCustomDomain(domain)}`,
    value: token,
  };
}

export function customDomainCnameRecord(domain: string) {
  return {
    type: "CNAME",
    name: normaliseCustomDomain(domain),
    value: CUSTOM_DOMAIN_DNS_TARGET,
  };
}
