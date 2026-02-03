// apps/app/src/app/(modules)/selfservice/request/new/ui/request-catalog-data.ts
export type CatalogItem = {
  id: string;
  name: string;
  desc: string;
  price: number;
  icon: "keyboard" | "mouse" | "monitor" | "laptop" | "headset" | "software" | "access";
  category: "Hardware" | "Software" | "Access";
};

export const demoCatalog: CatalogItem[] = [
  {
    id: "kbd_basic",
    name: "Keyboard (Standard)",
    desc: "Full-size wired keyboard.",
    price: 19.99,
    icon: "keyboard",
    category: "Hardware",
  },
  {
    id: "mouse_basic",
    name: "Mouse (Standard)",
    desc: "Wired mouse with scroll wheel.",
    price: 12.49,
    icon: "mouse",
    category: "Hardware",
  },
  {
    id: "monitor_24",
    name: "Monitor 24”",
    desc: "1080p IPS display.",
    price: 129.0,
    icon: "monitor",
    category: "Hardware",
  },
  {
    id: "headset",
    name: "Headset",
    desc: "USB headset with mic.",
    price: 39.0,
    icon: "headset",
    category: "Hardware",
  },
  {
    id: "laptop",
    name: "Laptop (Business)",
    desc: "Standard business laptop bundle.",
    price: 899.0,
    icon: "laptop",
    category: "Hardware",
  },
  {
    id: "m365",
    name: "Microsoft 365",
    desc: "Productivity suite license.",
    price: 12.0,
    icon: "software",
    category: "Software",
  },
  {
    id: "adobe",
    name: "Adobe (Creative)",
    desc: "Creative suite request.",
    price: 59.0,
    icon: "software",
    category: "Software",
  },
  {
    id: "vpn_access",
    name: "VPN access",
    desc: "Remote access to internal network.",
    price: 0,
    icon: "access",
    category: "Access",
  },
  {
    id: "admin_access",
    name: "Admin rights",
    desc: "Temporary admin elevation request.",
    price: 0,
    icon: "access",
    category: "Access",
  },
];
