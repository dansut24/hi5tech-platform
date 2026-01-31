import type { ReactNode } from "react";
import { cookies } from "next/headers";
import { createSupabaseServerClient } from "@hi5tech/auth";
import IncidentDetailFrame from "./incident-detail-frame";

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
      cookieStore.set({ name, value, ...(options ?? {}) });
    },
    remove(name: string, options: any) {
      const anyStore = cookieStore as any;
      if (typeof anyStore.delete === "function") {
        anyStore.delete(name);
        return;
      }
      cookieStore.set({ name, value: "", ...(options ?? {}), maxAge: 0 });
    },
  });
}

export default async function Layout({
  children,
  params,
}: {
  children: ReactNode;
  params: any;
}) {
  const p = await params;
  const number = p?.id as string; // URL param is incident number in this module

  let incident: Incident | null = null;

  try {
    const supabase = await supabaseServer();

    // Query by incident number to match page.tsx behavior
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
      .eq("number", number)
      .maybeSingle();

    incident = (data as any) ?? null;
  } catch {
    incident = null;
  }

  const frameId = incident?.id ?? number;

  return (
    <IncidentDetailFrame id={frameId} incident={incident}>
      {children}
    </IncidentDetailFrame>
  );
}
