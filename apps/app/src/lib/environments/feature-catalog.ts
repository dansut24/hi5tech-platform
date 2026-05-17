export type FeatureKey =
  | "itsm_core"
  | "devices_ticket_context"
  | "devices_inventory"
  | "devices_reporting"
  | "remote_control"
  | "remote_terminal"
  | "remote_files"
  | "scripts"
  | "monitoring"
  | "patch_management"
  | "automation";

export type FeatureDefinition = {
  key: FeatureKey;
  title: string;
  description: string;
  module: "ITSM" | "Control" | "Automation";
};

export const FEATURE_CATALOG: FeatureDefinition[] = [
  {
    key: "itsm_core",
    title: "ITSM Core",
    description: "Incidents, requests, service desk workflows and core ITSM features.",
    module: "ITSM",
  },
  {
    key: "devices_ticket_context",
    title: "Device context on tickets",
    description: "Show linked device and asset context directly inside tickets.",
    module: "ITSM",
  },
  {
    key: "devices_inventory",
    title: "Device inventory",
    description: "Track enrolled devices, hardware details, OS information and ownership.",
    module: "Control",
  },
  {
    key: "devices_reporting",
    title: "Device reporting",
    description: "Reporting views for devices, usage, health and inventory summaries.",
    module: "Control",
  },
  {
    key: "remote_control",
    title: "Remote control",
    description: "Allow technicians to launch remote control sessions from the portal.",
    module: "Control",
  },
  {
    key: "remote_terminal",
    title: "Remote terminal",
    description: "Allow technicians to open terminal or PowerShell sessions on devices.",
    module: "Control",
  },
  {
    key: "remote_files",
    title: "Remote files",
    description: "Allow technicians to browse and transfer files from managed devices.",
    module: "Control",
  },
  {
    key: "scripts",
    title: "Scripts",
    description: "Create, run and track scripts against devices or groups.",
    module: "Automation",
  },
  {
    key: "monitoring",
    title: "Monitoring",
    description: "Basic device monitoring, alerts and status indicators.",
    module: "Control",
  },
  {
    key: "patch_management",
    title: "Patch management",
    description: "Windows Update and software patch management workflows.",
    module: "Control",
  },
  {
    key: "automation",
    title: "Automation",
    description: "Scheduled actions, policies and automated platform workflows.",
    module: "Automation",
  },
];

export function getFeatureDefinition(featureKey: string) {
  return FEATURE_CATALOG.find((feature) => feature.key === featureKey);
}

export function isKnownFeatureKey(featureKey: string): featureKey is FeatureKey {
  return FEATURE_CATALOG.some((feature) => feature.key === featureKey);
}
