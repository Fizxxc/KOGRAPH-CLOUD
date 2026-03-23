import { NextResponse } from "next/server";
import { listStoredFiles } from "../../../../lib/server-vault";

export async function GET() {
  try {
    const files = await listStoredFiles();

    return NextResponse.json({
      ok: true,
      files: files.map((item) => ({
        id: item.id,
        createdAt: item.createdAt,
        size: item.size,
        fileExt: item.fileExt,
        mimeType: item.mimeType,
        attempts: item.attempts
      }))
    });
  } catch (error) {
    console.error("vault list error:", error);

    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "list_failed"
      },
      { status: 500 }
    );
  }
}