"use server";

import { createSupabaseServerClient } from "@hi5tech/auth";

function isHex(v: string) {
  return /^#[0-9a-fA-F]{6}$/.test(v);
}

function clampHex(v: string, fallback: string) {
  const x = (v || "").trim();
  return isHex(x) ? x : fallback;
}

export async function saveUserSettings(formData: FormData) {
  const supabase = await createSupabaseServerClient();

  const { data: userRes } = await supabase.auth.getUser();
  const user = userRes.user;
  if (!user) throw new Error("Not logged in");

  const theme_mode = String(formData.get("theme_mode") ?? "system");
  const accent_hex = clampHex(String(formData.get("accent_hex") ?? ""), "#2563eb");
  const bg_hex = clampHex(String(formData.get("bg_hex") ?? ""), "#ffffff");
  const card_hex = clampHex(String(formData.get("card_hex") ?? ""), "#ffffff");

  if (!["system", "light", "dark"].includes(theme_mode)) {
    throw new Error("Invalid theme mode");
  }

  const { error } = await supabase.from("user_settings").upsert({
    user_id: user.id,
    theme_mode,
    accent_hex,
    bg_hex,
    card_hex,
    updated_at: new Date().toISOString(),
  });

  if (error) throw new Error(error.message);
}