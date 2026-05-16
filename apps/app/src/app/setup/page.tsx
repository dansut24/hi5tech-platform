import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import SetupClient from "./setup-client";

export const dynamic = "force-dynamic";

export default async function SetupPage() {
  const supabase = await supabaseServer();

  const { data: userRes } = await supabase.auth.getUser();
  const user = userRes.user;

  if (!user) {
    redirect("/login");
  }

  const { data: existingMembership } = await supabase
    .from("memberships")
    .select("tenant_id")
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle();

  if (existingMembership?.tenant_id) {
    redirect("/apps");
  }

  const admin = supabaseAdmin();

  let { data: intent } = await admin
    .from("tenant_signup_intents")
    .select("id, company_name, subdomain, root_domain, admin_name, admin_email, status, auth_user_id, created_tenant_id, expires_at")
    .eq("auth_user_id", user.id)
    .in("status", ["pending_email", "confirmed"])
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!intent && user.email) {
    const res = await admin
      .from("tenant_signup_intents")
      .select("id, company_name, subdomain, root_domain, admin_name, admin_email, status, auth_user_id, created_tenant_id, expires_at")
      .eq("admin_email", user.email.toLowerCase())
      .in("status", ["pending_email", "confirmed"])
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    intent = res.data;
  }

  if (!intent) {
    redirect("/signup");
  }

  if (intent.status === "pending_email") {
    await admin
      .from("tenant_signup_intents")
      .update({
        status: "confirmed",
        auth_user_id: user.id,
        confirmed_at: new Date().toISOString(),
      })
      .eq("id", intent.id);

    intent.status = "confirmed";
    intent.auth_user_id = user.id;
  }

  return (
    <div className="min-h-[100dvh] px-4 py-6 sm:px-6 sm:py-10">
      <div className="mx-auto w-full max-w-5xl">
        <SetupClient
          intent={{
            id: intent.id,
            companyName: intent.company_name,
            subdomain: intent.subdomain,
            rootDomain: intent.root_domain,
            adminEmail: intent.admin_email,
            adminName: intent.admin_name,
          }}
        />
      </div>
    </div>
  );
}
