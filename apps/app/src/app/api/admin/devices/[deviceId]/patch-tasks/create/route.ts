import { NextRequest, NextResponse } from "next/server";
import { createPatchTasks } from "@/lib/software-intelligence/client";

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ deviceId: string }> }
) {
  try {
    const { deviceId } = await context.params;
    const data = await createPatchTasks(deviceId);

    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json(
      { ok: false, error: error.message || "Failed to create patch tasks" },
      { status: 500 }
    );
  }
}
