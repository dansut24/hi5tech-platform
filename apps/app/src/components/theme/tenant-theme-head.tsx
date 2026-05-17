import {
  buildTenantThemeCss,
  tenantThemeBootScript,
  type TenantTheme,
} from "@/lib/theme/tenant-theme";

export default function TenantThemeHead({ theme }: { theme: TenantTheme }) {
  return (
    <>
      <style
        id="hi5-tenant-theme"
        dangerouslySetInnerHTML={{
          __html: buildTenantThemeCss(theme),
        }}
      />

      <script
        id="hi5-tenant-theme-boot"
        dangerouslySetInnerHTML={{
          __html: tenantThemeBootScript(theme.defaultAppearance),
        }}
      />
    </>
  );
}
