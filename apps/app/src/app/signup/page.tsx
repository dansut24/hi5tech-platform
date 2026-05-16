import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";
import SignupClient from "./signup-client";

export const dynamic = "force-dynamic";

export default async function SignupPage() {
  const supabase = await supabaseServer();

  const { data: userRes } = await supabase.auth.getUser();

  if (userRes.user) {
    redirect("/onboarding");
  }

  return (
    <div className="min-h-[100dvh] flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-md">
        <div className="hi5-panel p-6 sm:p-8">
          <h1 className="text-2xl font-extrabold">Start your free trial</h1>
          <p className="mt-2 text-sm opacity-75">
            Create your Hi5Tech account, then set up your workspace.
          </p>

          <div className="mt-6">
            <SignupClient />
          </div>
        </div>
      </div>
    </div>
  );
}
