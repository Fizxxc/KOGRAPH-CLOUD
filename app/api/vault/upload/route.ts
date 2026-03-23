import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { writeStoredFile } from "../../../../lib/server-vault";

export async function POST(request: Request) {
  try {
    const body = await request.json();

    if (
      !body ||
      !body.encryptedData ||
      !body.nameData ||
      !body.salt ||
      !body.contentIv ||
      !body.nameIv
    ) {
      return NextResponse.json(
        { ok: false, error: "invalid_payload" },
        { status: 400 }
      );
    }

    const id = randomUUID();

    await writeStoredFile({
      id,
      createdAt: new Date().toISOString(),
      size: body.size ?? 0,
      fileExt: body.fileExt ?? "bin",
      mimeType: body.mimeType ?? "application/octet-stream",
      attempts: 0,
      payload: body
    });

    return NextResponse.json({
      ok: true,
      id
    });
  } catch (error) {
    console.error("vault upload error:", error);

    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "upload_failed"
      },
      { status: 500 }
    );
  }
}