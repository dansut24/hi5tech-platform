import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import {
  createTenantWorkspace,
  normalizeSubdomain,
  type OnboardingProduct,
} from "@/lib/onboarding/create-tenant-workspace";

export const dynamic = "force-dynamic";

function json(status: number, body: any) {
  return NextResponse.json(body, {
    status,
    headers: {
      "cache-control": "no-store",
    },
  });
}

export async function POST(req: Request) {
  try {
    const supabase = await supabaseServer();

    const { data: userRes, error: userError } = await supabase.auth.getUser();

    if (userError || !userRes.user) {
      return json(401, { error: "Not authenticated" });
    }

    const user = userRes.user;
    const body = await req.json().catch(() => null);

    const companyName = String(body?.companyName ?? "").trim();
    const requestedSubdomain = String(body?.subdomain ?? "").trim();
    const subdomain = normalizeSubdomain(requestedSubdomain);
    const product = String(body?.product ?? "both") as OnboardingProduct;
    const timezone = String(body?.timezone ?? "Europe/London").trim() || "Europe/London";

    const result = await createTenantWorkspace({
      userId: user.id,
      email: user.email || "",
      fullName:
        typeof user.user_metadata?.full_name === "string"
          ? user.user_metadata.full_name
          : null,
      companyName,
      subdomain,
      product,
      timezone,
    });

    const firstPath =
      product === "itsm"
        ? "/itsm"
        : product === "control"
          ? "/control/devices"
          : "/";

    return json(200, {
      ok: true,
      ...result,
      redirectTo: `${result.tenantUrl}${firstPath}`,
    });
  } catch (err) {
    return json(400, {
      error: err instanceof Error ? err.message : "Failed to create workspace",
    });
  }
}
