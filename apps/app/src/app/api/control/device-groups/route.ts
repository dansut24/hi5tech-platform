import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { supabaseServer } from "@/lib/supabase/server";
import { getEffectiveHost, parseTenantHost } from "@/lib/tenant/tenant-from-host";

export const dynamic = "force-dynamic";

type TenantContext = {
  supabase: Awaited<ReturnType<typeof supabaseServer>>;
  user: { id: string } | null;
  tenant: { id: string; name: string | null; subdomain: string | null; domain: string | null } | null;
};

function slugify(input: string) {
  const slug = input
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64);

  return slug || "default";
}

async function getContext(): Promise<TenantContext> {
  const supabase = await supabaseServer();
  const { data: userRes } = await supabase.auth.getUser();
  const user = userRes.user ? { id: userRes.user.id } : null;

  if (!user) return { supabase, user: null, tenant: null };

  const host = getEffectiveHost(await headers());
  const parsed = parseTenantHost(host);

  if (parsed.subdomain) {
    const { data: tenant } = await supabase
      .from("tenants")
      .select("id, name, subdomain, domain")
      .eq("domain", parsed.rootDomain)
      .eq("subdomain", parsed.subdomain)
      .maybeSingle();

    if (tenant) return { supabase, user, tenant };
  }

  const { data: membership } = await supabase
    .from("memberships")
    .select("tenant_id")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!membership?.tenant_id) return { supabase, user, tenant: null };

  const { data: tenant } = await supabase
    .from("tenants")
    .select("id, name, subdomain, domain")
    .eq("id", membership.tenant_id)
    .maybeSingle();

  return { supabase, user, tenant: tenant ?? null };
}

async function ensureDefaultGroup(ctx: TenantContext) {
  if (!ctx.tenant) return;

  await ctx.supabase.from("device_groups").upsert(
    {
      tenant_id: ctx.tenant.id,
      name: "Default",
      slug: "default",
      description: "Default device group",
      created_by: ctx.user?.id ?? null,
    },
    { onConflict: "tenant_id,slug" }
  );
}

export async function GET() {
  const ctx = await getContext();
  if (!ctx.user || !ctx.tenant) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await ensureDefaultGroup(ctx);

  const { data, error } = await ctx.supabase
    .from("device_groups")
    .select("id, tenant_id, name, slug, description, created_at, updated_at, archived_at")
    .eq("tenant_id", ctx.tenant.id)
    .is("archived_at", null)
    .order("name", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ groups: data ?? [], tenant: ctx.tenant });
}

export async function POST(req: Request) {
  const ctx = await getContext();
  if (!ctx.user || !ctx.tenant) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const name = String(body?.name ?? "").trim();
  const description = body?.description ? String(body.description).trim() : null;
  const requestedSlug = body?.slug ? String(body.slug).trim() : name;
  const slug = slugify(requestedSlug);

  if (!name) {
    return NextResponse.json({ error: "Group name required" }, { status: 400 });
  }

  const { data, error } = await ctx.supabase
    .from("device_groups")
    .insert({
      tenant_id: ctx.tenant.id,
      name,
      slug,
      description,
      created_by: ctx.user.id,
    })
    .select("id, tenant_id, name, slug, description, created_at, updated_at, archived_at")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ group: data });
}
