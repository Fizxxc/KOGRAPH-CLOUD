import { NextResponse } from "next/server";
import { deleteStoredFile } from "../../../../lib/server-vault";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const id = body?.id;

    if (!id || typeof id !== "string") {
      return NextResponse.json(
        { ok: false, error: "missing_id" },
        { status: 400 }
      );
    }

    await deleteStoredFile(id);

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("vault burn error:", error);

    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "burn_failed"
      },
      { status: 500 }
    );
  }
}