import { NextResponse } from "next/server";
import { deleteStoredFile } from "../../../../lib/server-vault";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const id = body?.id;

    if (!id) {
      return NextResponse.json({ error: "missing_id" }, { status: 400 });
    }

    await deleteStoredFile(id);

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("vault burn error:", error);
    return NextResponse.json({ error: "burn_failed" }, { status: 500 });
  }
}