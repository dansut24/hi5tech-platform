// apps/app/src/app/(modules)/control/ui/device-data.ts
export type DeviceRow = {
  id: string;
  name: string;
  status: "online" | "offline" | "warning";
  os: string;
  lastSeen: string;
  user?: string;
  tags: string[];
  ip?: string;
};

export const demoDevices: DeviceRow[] = [
  {
    id: "dev_001",
    name: "FIN-LAPTOP-01",
    status: "online",
    os: "Windows 11 Pro",
    lastSeen: "Just now",
    user: "Dan Sutton",
    tags: ["Finance", "Laptop"],
    ip: "10.0.1.22",
  },
  {
    id: "dev_002",
    name: "RECEPTION-PC",
    status: "warning",
    os: "Windows 10",
    lastSeen: "6 mins ago",
    user: "Reception",
    tags: ["Front Desk"],
    ip: "10.0.1.18",
  },
  {
    id: "dev_003",
    name: "MAC-MGMT-02",
    status: "online",
    os: "macOS Sonoma",
    lastSeen: "2 mins ago",
    user: "Ops",
    tags: ["Management"],
    ip: "10.0.2.7",
  },
  {
    id: "dev_004",
    name: "LINUX-BUILD-01",
    status: "offline",
    os: "Ubuntu 22.04",
    lastSeen: "12 hrs ago",
    user: "CI",
    tags: ["Build", "Server"],
    ip: "10.0.3.10",
  },
  {
    id: "dev_005",
    name: "SALES-LAPTOP-07",
    status: "online",
    os: "Windows 11 Pro",
    lastSeen: "1 min ago",
    user: "Sales",
    tags: ["Sales", "Laptop"],
    ip: "10.0.1.77",
  },
];
