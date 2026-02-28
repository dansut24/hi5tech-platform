// apps/app/src/app/api/selfservice/incident/route.ts

import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { supabaseServer } from "@/lib/supabase/server";
import { getEffectiveHost, parseTenantHost } from "@/lib/tenant/tenant-from-host";

export async function POST(req: Request) {
  try {
    const supabase = await supabaseServer();

    const { data: userRes } = await supabase.auth.getUser();
    const user = userRes.user;

    if (!user) {
      return NextResponse.json(
        { error: "Not authenticated" },
        { status: 401 }
      );
    }

    // Tenant resolution (same logic you had before)
    const host = getEffectiveHost(await headers());
    const parsed = parseTenantHost(host);

    if (!parsed.subdomain) {
      return NextResponse.json(
        { error: "No tenant context" },
        { status: 400 }
      );
    }

    const { data: tenant } = await supabase
      .from("tenants")
      .select("id")
      .eq("domain", parsed.rootDomain)
      .eq("subdomain", parsed.subdomain)
      .maybeSingle();

    if (!tenant) {
      return NextResponse.json(
        { error: "Tenant not found" },
        { status: 404 }
      );
    }

    const body = await req.json();
    const title = String(body.title || "").trim();
    const description = String(body.description || "").trim();
    const priority = String(body.priority || "medium").toLowerCase();

    if (!title) {
      return NextResponse.json(
        { error: "Title is required" },
        { status: 400 }
      );
    }

    const number = `INC-${Date.now().toString().slice(-6)}`;

    const { data: inserted, error } = await supabase
      .from("incidents")
      .insert({
        tenant_id: tenant.id,
        title,
        description,
        priority,
        status: "new",
        triage_status: "untriaged",
        requester_id: user.id,
        submitted_by: user.email,
        number,
      })
      .select("id")
      .single();

    if (error) {
      console.error("Incident insert error:", error);
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      id: inserted.id,
    });
  } catch (err: any) {
    console.error("Incident API error:", err);
    return NextResponse.json(
      { error: "Unexpected error" },
      { status: 500 }
    );
  }
}
