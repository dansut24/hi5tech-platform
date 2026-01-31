import Link from "next/link";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@hi5tech/auth";
import ThemeForm from "./theme-form";

export default async function SettingsPage() {
  const supabase = await createSupabaseServerClient();

  const { data: userRes } = await supabase.auth.getUser();
  const user = userRes.user;
  if (!user) redirect("/login");

  const { data } = await supabase
    .from("user_settings")
    .select("theme_mode, accent_hex, bg_hex, card_hex")
    .eq("user_id", user.id)
    .maybeSingle();

  const initial = {
    theme_mode: (data?.theme_mode ?? "system") as "system" | "light" | "dark",
    accent_hex: data?.accent_hex ?? "#2563eb",
    bg_hex: data?.bg_hex ?? "#ffffff",
    card_hex: data?.card_hex ?? "#ffffff",
  };

  return (
    <div className="space-y-4">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Settings</h1>
          <p className="opacity-80">Theme & appearance</p>
        </div>
        <Link className="underline" href="/apps">
          Back
        </Link>
      </div>

      <ThemeForm initial={initial} />
    </div>
  );
}