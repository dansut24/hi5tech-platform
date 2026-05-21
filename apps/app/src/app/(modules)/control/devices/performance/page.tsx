import { redirect } from "next/navigation";

export default function LegacyDevicesPerformanceRedirectPage() {
  redirect("/control/performance");
}
