import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function LegacyControlDeviceRedirect({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { id } = await params;
  const sp = await searchParams;
  const tab = typeof sp.tab === "string" ? sp.tab : "overview";

  redirect(`/control/devices/${encodeURIComponent(id)}?tab=${encodeURIComponent(tab)}`);
}
