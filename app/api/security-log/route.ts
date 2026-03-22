import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const payload = {
      timestamp: new Date().toISOString(),
      level: body?.level ?? "info",
      source: body?.source ?? "unknown",
      message: body?.message ?? "no-message",
      meta: body?.meta ?? {}
    };

    const line = `[KOGRAPH.INT][${payload.level.toUpperCase()}] ${payload.timestamp} ${payload.source} :: ${payload.message} ${JSON.stringify(payload.meta)}`;

    console.log(line);

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[KOGRAPH.INT][ERROR] Failed to write security log", error);

    return NextResponse.json({ ok: false, error: "failed_to_log" }, { status: 500 });
  }
}
