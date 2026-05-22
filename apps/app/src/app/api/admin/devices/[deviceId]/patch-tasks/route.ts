import { NextRequest, NextResponse } from "next/server";
import { getPatchTasks } from "@/lib/software-intelligence/client";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ deviceId: string }> }
) {
  try {
    const { deviceId } = await context.params;
    const data = await getPatchTasks(deviceId);

    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json(
      { ok: false, error: error.message || "Failed to get patch tasks" },
      { status: 500 }
    );
  }
}
