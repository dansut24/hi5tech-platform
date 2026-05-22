import { NextResponse } from "next/server";
import { getPatchTasks } from "@/lib/software-intelligence/client";

export async function GET(
  request: Request,
  { params }: { params: { deviceId: string } }
) {
  try {
    const data = await getPatchTasks(params.deviceId);
    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json(
      { ok: false, error: error.message },
      { status: 500 }
    );
  }
}
