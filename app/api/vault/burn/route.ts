import { NextResponse } from "next/server";
import { deleteStoredFile } from "@/lib/server-vault";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const id = body.id as string;
    await deleteStoredFile(id);
    console.log(`[VAULT] burn protocol removed ${id}`);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[VAULT] burn failed", error);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
