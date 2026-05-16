import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";
import OnboardingClient from "./onboarding-client";

export const dynamic = "force-dynamic";

export default async function OnboardingPage() {
  const supabase = await supabaseServer();

  const { data: userRes } = await supabase.auth.getUser();
  const user = userRes.user;

  if (!user) {
    redirect("/signup");
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

  return (
    <div className="min-h-[100dvh] px-4 py-6 sm:px-6 sm:py-10">
      <div className="mx-auto w-full max-w-5xl">
        <OnboardingClient
          email={user.email || ""}
          defaultCompanyName=""
          defaultSubdomain=""
        />
      </div>
    </div>
  );
}
