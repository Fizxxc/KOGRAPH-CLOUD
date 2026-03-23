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

    if (!id || typeof id !== "string") {
      return NextResponse.json({ ok: false, error: "missing_id" }, { status: 400 });
    }

    const record = await readStoredFile(id);

    if (!record) {
      return NextResponse.json({ ok: false, error: "file_not_found" }, { status: 404 });
    }

    return NextResponse.json({
      ok: true,
      file: {
        ...(record.payload as Record<string, unknown>),
        attempts: Number(record.attempts ?? 0)
      }
    });
  } catch (error) {
    console.error("vault file GET error:", error);

    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "read_failed"
      },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const id = body?.id;

    if (!id || typeof id !== "string") {
      return NextResponse.json({ ok: false, error: "missing_id" }, { status: 400 });
    }

    const attempts = await incrementAttempts(id);

    return NextResponse.json({
      ok: true,
      attempts
    });
  } catch (error) {
    console.error("vault file PATCH error:", error);

    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "attempt_failed"
      },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const id = body?.id;

    if (!id || typeof id !== "string") {
      return NextResponse.json({ ok: false, error: "missing_id" }, { status: 400 });
    }

    await resetAttempts(id);

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("vault file PUT error:", error);

    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "reset_failed"
      },
      { status: 500 }
    );
  }
}