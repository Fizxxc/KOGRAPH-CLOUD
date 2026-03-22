import { NextResponse } from "next/server";
import { writeStoredFile } from "../../../../lib/server-vault";
import crypto from "crypto";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const id = crypto.randomUUID();
    await writeStoredFile({
      id,
      originalNameEnc: body.originalNameEnc,
      fileExt: body.fileExt,
      mimeType: body.mimeType,
      cipherText: body.cipherText,
      salt: body.salt,
      contentIv: body.contentIv,
      nameIv: body.nameIv,
      createdAt: new Date().toISOString(),
      size: body.size ?? 0,
      attempts: 0
    });
    console.log(`[VAULT] stored encrypted file ${id}`);
    return NextResponse.json({ ok: true, id });
  } catch (error) {
    console.error("[VAULT] upload failed", error);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
