import { NextResponse } from "next/server";
import path from "node:path";
import fs from "node:fs/promises";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const id = url.searchParams.get("id");

  if (!id) {
    return NextResponse.json({ error: "id required" }, { status: 400 });
  }

  const filePath = path.join(process.cwd(), "public", "downloads", "Hi5TechAgentSetup.exe");

  try {
    const file = await fs.readFile(filePath);

    return new NextResponse(file, {
      headers: {
        "Content-Type": "application/vnd.microsoft.portable-executable",
        "Content-Disposition": `attachment; filename="Hi5TechAgentSetup-${id}.exe"`,
        "Cache-Control": "no-store",
      },
    });
  } catch {
    return NextResponse.json({ error: "Installer not found" }, { status: 404 });
  }
}
