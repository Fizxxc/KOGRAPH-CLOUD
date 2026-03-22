import { NextResponse } from "next/server";
import { readStoredFile } from "../../../../../lib/server-vault";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const file = await readStoredFile(id);

  if (!file) {
    return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
  }

  return NextResponse.json({
    ok: true,
    file,
  });
}
