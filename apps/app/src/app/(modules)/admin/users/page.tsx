// apps/app/src/app/(modules)/admin/users/page.tsx
import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";
import UsersClient from "./users-client";

export default async function AdminUsersPage() {
  const supabase = await supabaseServer();

  const { data: userRes } = await supabase.auth.getUser();
  if (!userRes.user) redirect("/login");

  // UI is client-driven; server just ensures authed.
  return <UsersClient />;
}
