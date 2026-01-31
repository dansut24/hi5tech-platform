// apps/marketing/src/app/api/signup/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
  const body = await req.json();
  const { companyName, subdomain, email, password } = body;

  if (!companyName || !subdomain || !email || !password) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  // 1. Create auth user
  const { data: auth, error: authError } =
    await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });

  if (authError) {
    return NextResponse.json({ error: authError.message }, { status: 400 });
  }

  const userId = auth.user.id;

  // 2. Create tenant
  const trialEnds = new Date();
  trialEnds.setDate(trialEnds.getDate() + 14);

  const { data: tenant, error: tenantError } = await supabase
    .from("tenants")
    .insert({
      name: companyName,
      subdomain,
      plan: "trial",
      status: "active",
      trial_ends_at: trialEnds.toISOString(),
    })
    .select()
    .single();

  if (tenantError) {
    return NextResponse.json({ error: tenantError.message }, { status: 400 });
  }

  // 3. Create membership (admin)
  await supabase.from("memberships").insert({
    user_id: userId,
    tenant_id: tenant.id,
    role: "admin",
  });

  // 4. Default tenant settings
  await supabase.from("tenant_settings").insert({
    tenant_id: tenant.id,
  });

  return NextResponse.json({
    success: true,
    redirect: "/login",
  });
}
