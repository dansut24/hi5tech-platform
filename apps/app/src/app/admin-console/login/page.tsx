import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";
import PlatformAdminLoginForm from "./platform-admin-login-form";

export const dynamic = "force-dynamic";

export default async function PlatformAdminLoginPage() {
  const supabase = await supabaseServer();
  const { data: userRes } = await supabase.auth.getUser();

  if (userRes.user) {
    redirect("/admin-console");
  }

  return (
    <div className="hi5-page grid place-items-center px-4">
      <div className="hi5-panel w-full max-w-md p-5 sm:p-7">
        <div className="text-xs uppercase tracking-[0.22em] opacity-60">
          Hi5Tech Platform Admin
        </div>

        <h1 className="mt-3 text-3xl font-black tracking-tight">
          Admin sign in
        </h1>

        <p className="mt-2 text-sm leading-6 opacity-75">
          Temporary testing mode is enabled. Any valid signed-in account can access the admin console.
          MFA and platform admin user checks will be enforced later.
        </p>

        <div className="mt-6">
          <PlatformAdminLoginForm />
        </div>
      </div>
    </div>
  );
}
