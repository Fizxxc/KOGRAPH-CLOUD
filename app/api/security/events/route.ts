import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const payload = {
      timestamp: new Date().toISOString(),
      level: body?.level ?? "info",
      source: body?.source ?? "unknown",
      event: body?.event ?? "unknown_event",
      message: body?.message ?? "",
      meta: body?.meta ?? {}
    };
    console.log(`[KOGRAPH.INT][${payload.level.toUpperCase()}] ${payload.timestamp} ${payload.source} ${payload.event} :: ${payload.message} ${JSON.stringify(payload.meta)}`);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[KOGRAPH.INT][ERROR] logging failed", error);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
