import type { ReactNode } from "react";
import IncidentDetailFrame from "./IncidentDetailFrame";
import { supabaseServer } from "@/lib/supabase/server";

type Incident = {
  id: string;
  number?: string | number | null;
  title?: string | null;
  subject?: string | null;
  status?: string | null;
  priority?: string | null;
};

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
      .select("id, number, title, subject, status, priority")
      .eq("id", id)
      .maybeSingle();

    incident = (data as any) ?? null;
  } catch {
    incident = null;
  }

  return (
    <IncidentDetailFrame
      number={incident?.number ? String(incident.number) : id}
      title={incident?.title ?? incident?.subject ?? "Untitled incident"}
      status={incident?.status ?? null}
      priority={incident?.priority ?? null}
    >
      {children}
    </IncidentDetailFrame>
  );
}
