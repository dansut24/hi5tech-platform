import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

function bearerToken(req: Request) {
  const value = req.headers.get("authorization") || "";
  const match = value.match(/^Bearer\s+(.+)$/i);
  return match?.[1]?.trim() || "";
}

function safeStatus(value: unknown) {
  const status = String(value ?? "").trim();
  if (status === "ready" || status === "failed" || status === "building") {
    return status;
  }
  return "";
}

export async function POST(req: Request) {
  const expected = process.env.INSTALLER_BUILD_CALLBACK_SECRET;

  if (!expected) {
    return NextResponse.json(
      { error: "Missing INSTALLER_BUILD_CALLBACK_SECRET" },
      { status: 500 }
    );
  }

  const supplied = bearerToken(req);

  if (!supplied || supplied !== expected) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);

  const packageId = String(body?.package_id ?? "").trim();
  const status = safeStatus(body?.status);

  if (!packageId) {
    return NextResponse.json({ error: "package_id required" }, { status: 400 });
  }

  if (!status) {
    return NextResponse.json({ error: "valid status required" }, { status: 400 });
  }

  const admin = supabaseAdmin();

  const patch: Record<string, any> = {
    installer_status: status,
  };

  if (status === "ready") {
    patch.installer_file_path = String(body?.installer_file_path ?? "").trim();
    patch.installer_filename = String(body?.installer_filename ?? "").trim();
    patch.installer_generated_at =
      String(body?.installer_generated_at ?? "").trim() || new Date().toISOString();
    patch.installer_error = null;

    if (!patch.installer_file_path || !patch.installer_filename) {
      return NextResponse.json(
        { error: "installer_file_path and installer_filename required for ready status" },
        { status: 400 }
      );
    }
  }

  if (status === "failed") {
    patch.installer_error =
      String(body?.installer_error ?? "").trim() ||
      "Provisioned installer build failed";
  }

  const { data, error } = await admin
    .from("enrollment_packages")
    .update(patch)
    .eq("id", packageId)
    .select(
      "id, tenant_id, group_id, name, status, installer_status, installer_file_path, installer_filename, installer_requested_at, installer_generated_at, installer_error"
    )
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!data) {
    return NextResponse.json({ error: "Package not found" }, { status: 404 });
  }

  return NextResponse.json({ ok: true, package: data });
}
