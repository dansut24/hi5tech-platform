// apps/app/src/app/page.tsx
import { redirect } from "next/navigation";
import { getTenantEnvironmentHost } from "@/lib/tenant/environment-host";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function HomePage() {
  const hostInfo = await getTenantEnvironmentHost();

  if (hostInfo.isPlatformAdminHost) {
    redirect("/admin-console");
  }

  if (hostInfo.isAppHost) {
    redirect("/workspaces");
  }

  if (hostInfo.isTenantHost) {
    redirect("/apps");
  }

  redirect("/workspaces");
}
