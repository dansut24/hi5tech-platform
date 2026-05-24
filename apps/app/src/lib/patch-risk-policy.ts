export type PatchRiskInput = {
  updateAvailable?: boolean;
  riskSeverity?: string;
  cvssScore?: number;
  knownExploited?: boolean;
  cveCount?: number;
};

export function getPatchRiskPriority(item: PatchRiskInput) {
  const severity = String(item.riskSeverity || "None").toLowerCase();
  const cvss = Number(item.cvssScore || 0);
  const cveCount = Number(item.cveCount || 0);
  const hasUpdate = Boolean(item.updateAvailable);
  const kev = Boolean(item.knownExploited);

  if (kev && hasUpdate) {
    return {
      priority: "urgent",
      label: "Urgent security update",
      reason: "Known exploited vulnerability with an available update"
    };
  }

  if ((severity === "critical" || cvss >= 9) && hasUpdate) {
    return {
      priority: "critical",
      label: "Critical security update",
      reason: "Critical vulnerability with an available update"
    };
  }

  if ((severity === "high" || cvss >= 7) && hasUpdate) {
    return {
      priority: "high",
      label: "High priority security update",
      reason: "High severity vulnerability with an available update"
    };
  }

  if (cveCount > 0 && !hasUpdate) {
    return {
      priority: "unsupported-risk",
      label: "Vulnerable, no update found",
      reason: "Installed app appears vulnerable but no patch source/version is available"
    };
  }

  if (hasUpdate) {
    return {
      priority: "routine",
      label: "Routine update",
      reason: "Update available with no confirmed active vulnerability risk"
    };
  }

  return {
    priority: "none",
    label: "No action required",
    reason: "No update or confirmed vulnerability risk"
  };
}
