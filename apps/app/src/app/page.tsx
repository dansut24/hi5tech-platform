import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";

export default async function HomePage() {
  const supabase = await supabaseServer();

  // If logged in, send them somewhere useful
  const { data } = await supabase.auth.getUser();
  if (data.user) redirect("/apps");

  // Otherwise go straight to login
  redirect("/login");
}
