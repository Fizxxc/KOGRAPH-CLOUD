import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { writeStoredFile } from "../../../../lib/server-vault";

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const id = randomUUID();
    const now = new Date().toISOString();

    const record = {
      id,
      createdAt: now,
      size: body.size ?? 0,
      fileExt: body.fileExt ?? "bin",
      mimeType: body.mimeType ?? "application/octet-stream",
      attempts: 0,
      payload: body
    };

    await writeStoredFile(record);

    return NextResponse.json({
      ok: true,
      id
    });
  } catch (error) {
    console.error("vault upload error:", error);

    return NextResponse.json(
      { ok: false, error: "upload_failed" },
      { status: 500 }
    );
  }
}