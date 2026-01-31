import type { ReactNode } from "react";
import { cookies } from "next/headers";
import IncidentDetailFrame from "./incident-detail-frame";
import { createSupabaseServerClient } from "@hi5tech/auth";

type Incident = {
  id: string;
  number?: string | number | null;
  title?: string | null;
  subject?: string | null;
  status?: string | null;
  priority?: string | null;
  created_at?: string | null;
  updated_at?: string | null;

  requester_name?: string | null;
  requester_email?: string | null;

  assignee_name?: string | null;

  response_due_at?: string | null;
  resolution_due_at?: string | null;
};

async function supabaseServer() {
  const cookieStore = await cookies();

  return createSupabaseServerClient({
    get(name: string) {
      return cookieStore.get(name)?.value;
    },
    set(name: string, value: string, options: any) {
      // next/headers cookies().set supports object form
      (cookieStore as any).set({ name, value, ...(options ?? {}) });
    },
    remove(name: string, options: any) {
      const anyStore = cookieStore as any;
      if (typeof anyStore.delete === "function") {
        anyStore.delete(name);
        return;
      }
      // Fallback: expire cookie
      anyStore.set({ name, value: "", ...(options ?? {}), maxAge: 0 });
    },
  });
}

export default async function Layout({
  children,
  params,
}: {
  children: ReactNode;
  params: any; // Next 16: params can be Promise in some runtimes
}) {
  const p = await params;
  const id = p?.id as string;

  let incident: Incident | null = null;

  try {
    const supabase = await supabaseServer();

    const { data } = await supabase
      .from("incidents")
      .select(
        `
          id,
          number,
          title,
          subject,
          status,
          priority,
          created_at,
          updated_at,
          requester_name,
          requester_email,
          assignee_name,
          response_due_at,
          resolution_due_at
        `
      )
      .eq("id", id)
      .maybeSingle();

    incident = (data as any) ?? null;
  } catch {
    incident = null;
  }

  return (
    <IncidentDetailFrame id={id} incident={incident}>
      {children}
    </IncidentDetailFrame>
  );
}
