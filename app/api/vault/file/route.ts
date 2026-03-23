import { NextResponse } from "next/server";
import {
  incrementAttempts,
  readStoredFile,
  resetAttempts
} from "../../../../lib/server-vault";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "missing_id" }, { status: 400 });
    }

    const record = await readStoredFile(id);

    if (!record) {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }

    return NextResponse.json({
      file: {
        ...(record.payload as object),
        attempts: record.attempts
      }
    });
  } catch (error) {
    console.error("vault file GET error:", error);
    return NextResponse.json({ error: "read_failed" }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const id = body?.id;

    if (!id) {
      return NextResponse.json({ error: "missing_id" }, { status: 400 });
    }

    const attempts = await incrementAttempts(id);
    return NextResponse.json({ ok: true, attempts });
  } catch (error) {
    console.error("vault file PATCH error:", error);
    return NextResponse.json({ error: "attempt_failed" }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const id = body?.id;

    if (!id) {
      return NextResponse.json({ error: "missing_id" }, { status: 400 });
    }

    await resetAttempts(id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("vault file PUT error:", error);
    return NextResponse.json({ error: "reset_failed" }, { status: 500 });
  }
}