// apps/app/src/app/(modules)/itsm/layout.tsx
import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";
import ItsmShell from "./_components/ItsmShell";

export default async function ItsmLayout({ children }: { children: ReactNode }) {
  const supabase = await supabaseServer();

  const { data: userRes } = await supabase.auth.getUser();
  const user = userRes.user;
  if (!user) redirect("/login");

  // Theme is now GLOBAL (handled in /app/layout.tsx + globals.css),
  // so ITSM layout should only render ITSM chrome/content.
  return <ItsmShell>{children}</ItsmShell>;
}
