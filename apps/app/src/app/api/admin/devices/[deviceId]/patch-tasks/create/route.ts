import { NextResponse } from "next/server";
import { createPatchTasks } from "@/lib/software-intelligence/client";

export async function POST(
  request: Request,
  { params }: { params: { deviceId: string } }
) {
  try {
    const data = await createPatchTasks(params.deviceId);
    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json(
      { ok: false, error: error.message },
      { status: 500 }
    );
  }
}
