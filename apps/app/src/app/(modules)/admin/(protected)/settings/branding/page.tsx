// apps/app/src/app/(modules)/admin/(protected)/settings/branding/page.tsx
import Link from "next/link";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { supabaseServer } from "@/lib/supabase/server";
import { getEffectiveHost, parseTenantHost } from "@/lib/tenant/tenant-from-host";
import BrandingEditorClient from "./ui/branding-editor-client";

export const dynamic = "force-dynamic";

type TenantSettingsRow = {
  // legacy
  logo_url: string | null;

  // new
  logo_light_url: string | null;
  logo_dark_url: string | null;

  accent_hex: string | null;
  accent_2_hex: string | null;
  accent_3_hex: string | null;

  bg_hex: string | null;
  card_hex: string | null;
  topbar_hex: string | null;

  glow_1: number | null;
  glow_2: number | null;
  glow_3: number | null;
};

export default async function AdminSettingsBrandingPage() {
  const supabase = await supabaseServer();

  const { data: userRes } = await supabase.auth.getUser();
  const user = userRes.user;
  if (!user) redirect("/login");

  const host = getEffectiveHost(await headers());
  const parsed = parseTenantHost(host);
  if (!parsed.subdomain) redirect("/apps");

  const { data: tenant } = await supabase
    .from("tenants")
    .select("id, name, domain, subdomain, is_active")
    .eq("domain", parsed.rootDomain)
    .eq("subdomain", parsed.subdomain)
    .maybeSingle();

  if (!tenant || tenant.is_active === false) redirect("/apps");

  const { data: membership } = await supabase
    .from("memberships")
    .select("role")
    .eq("tenant_id", tenant.id)
    .eq("user_id", user.id)
    .maybeSingle();

  const role = String(membership?.role || "");
  if (role !== "owner" && role !== "admin") redirect("/apps");

  const { data: rawSettings } = await supabase
    .from("tenant_settings")
    .select(
      [
        "logo_url",
        "logo_light_url",
        "logo_dark_url",
        "accent_hex",
        "accent_2_hex",
        "accent_3_hex",
        "bg_hex",
        "card_hex",
        "topbar_hex",
        "glow_1",
        "glow_2",
        "glow_3",
      ].join(",")
    )
    .eq("tenant_id", tenant.id)
    .maybeSingle();

  const settings = (rawSettings as unknown as TenantSettingsRow | null) ?? null;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <Link href="/admin/settings" className="hi5-btn-ghost text-sm w-auto">
          ← Back
        </Link>
        <Link href="/admin/tenant" className="hi5-btn-ghost text-sm w-auto">
          Tenant settings
        </Link>
      </div>

      <div className="hi5-panel p-6">
        <div className="text-xs opacity-70">Admin Settings</div>
        <h1 className="text-2xl font-extrabold mt-1">Branding</h1>
        <p className="text-sm opacity-75 mt-2">
          Upload logos (light/dark) and customize your theme. Changes apply across modules.
        </p>
      </div>

      <BrandingEditorClient
        tenant={{
          id: tenant.id,
          name: tenant.name,
          domain: tenant.domain,
          subdomain: tenant.subdomain,
        }}
        initial={{
          // logo variants with fallback to legacy
          logo_light_url: settings?.logo_light_url ?? settings?.logo_url ?? "",
          logo_dark_url: settings?.logo_dark_url ?? "",

          accent_hex: settings?.accent_hex ?? "#00c1ff",
          accent_2_hex: settings?.accent_2_hex ?? "#ff4fe1",
          accent_3_hex: settings?.accent_3_hex ?? "#ffc42d",

          bg_hex: settings?.bg_hex ?? "#f8fafc",
          card_hex: settings?.card_hex ?? "#ffffff",
          topbar_hex: settings?.topbar_hex ?? "",

          glow_1: typeof settings?.glow_1 === "number" ? settings!.glow_1 : 0.18,
          glow_2: typeof settings?.glow_2 === "number" ? settings!.glow_2 : 0.14,
          glow_3: typeof settings?.glow_3 === "number" ? settings!.glow_3 : 0.1,
        }}
      />
    </div>
  );
}
