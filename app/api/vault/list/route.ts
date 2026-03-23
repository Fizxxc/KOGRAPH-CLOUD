import { NextResponse } from "next/server";
import { listStoredFiles } from "../../../../lib/server-vault";

export async function GET() {
  try {
    const files = await listStoredFiles();

    return NextResponse.json({
      ok: true,
      files
    });
  } catch (error) {
    console.error("vault list error:", error);

    return NextResponse.json(
      {
        ok: false,
        files: [],
        error: error instanceof Error ? error.message : "list_failed"
      },
      { status: 500 }
    );
  }
}