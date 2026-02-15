import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";
import { getMemberTenantIds } from "@/lib/tenant";
import NewIncidentClient from "./ui/new-incident-client";

export const dynamic = "force-dynamic";

export default async function NewIncidentPage() {
  const supabase = await supabaseServer();

  const { data: ures } = await supabase.auth.getUser();
  const user = ures.user;
  if (!user) redirect("/login");

  const tenantIds = await getMemberTenantIds();
  if (!tenantIds.length) {
    return (
      <div className="hi5-card p-4 text-sm opacity-80">
        You don’t belong to any tenants yet.
      </div>
    );
  }

  const { data: tenants } = await supabase
    .from("tenants")
    .select("id,name,subdomain,domain")
    .in("id", tenantIds)
    .order("name", { ascending: true });

  return (
    <div className="space-y-4">
      <div className="hi5-panel p-6">
        <div className="text-xs opacity-70">ITSM</div>
        <h1 className="text-2xl font-extrabold mt-1">New incident</h1>
        <p className="text-sm opacity-75 mt-2">
          Submit an incident to the Service Desk for triage and assignment.
        </p>
      </div>

      <NewIncidentClient tenants={(tenants ?? []) as any} />
    </div>
  );
}
