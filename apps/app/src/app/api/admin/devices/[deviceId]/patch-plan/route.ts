import { NextResponse } from "next/server";
import { getPatchPlan } from "@/lib/software-intelligence/client";

export async function GET(
  request: Request,
  { params }: { params: { deviceId: string } }
) {
  try {
    const data = await getPatchPlan(params.deviceId);
    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json(
      { ok: false, error: error.message || "Failed to get patch plan" },
      { status: 500 }
    );
  }
}
