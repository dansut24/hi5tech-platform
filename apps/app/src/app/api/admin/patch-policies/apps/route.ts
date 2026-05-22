import { NextRequest, NextResponse } from "next/server";
import { updatePatchPolicyAppDecision } from "@/lib/software-intelligence/client";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const data = await updatePatchPolicyAppDecision(body);

    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json(
      {
        ok: false,
        error: error.message || "Failed to update patch policy app"
      },
      { status: 500 }
    );
  }
}
