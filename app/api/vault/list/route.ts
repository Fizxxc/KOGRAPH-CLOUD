import { NextResponse } from "next/server";
import { listStoredFiles } from "../../../../lib/server-vault";

export async function GET() {
  const files = await listStoredFiles();
  return NextResponse.json({
    files: files.map((file) => ({
      id: file.id,
      createdAt: file.createdAt,
      size: file.size,
      fileExt: file.fileExt,
      mimeType: file.mimeType,
      attempts: file.attempts
    }))
  });
}
