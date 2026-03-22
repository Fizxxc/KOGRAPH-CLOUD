import { NextResponse } from "next/server";
import { readStoredFile, writeStoredFile } from "@/lib/server-vault";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ ok: false }, { status: 400 });

  const file = await readStoredFile(id);
  if (!file) return NextResponse.json({ ok: false }, { status: 404 });

  return NextResponse.json({ ok: true, file });
}

export async function PATCH(req: Request) {
  const body = await req.json();
  const id = body.id as string;
  const file = await readStoredFile(id);
  if (!file) return NextResponse.json({ ok: false }, { status: 404 });

  file.attempts = typeof body.attempts === "number" ? body.attempts : file.attempts + 1;
  await writeStoredFile(file);
  return NextResponse.json({ ok: true, attempts: file.attempts });
}
