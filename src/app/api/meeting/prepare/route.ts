import { NextResponse } from "next/server";
import type { MeetingState } from "@/lib/types";
import { runResearch } from "@/lib/engine/research";

export const runtime = "nodejs";
export const maxDuration = 300;

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as { state?: MeetingState; participantId?: string };
    const s = body?.state;
    if (!s?.config || !Array.isArray(s.config.participants) || typeof body.participantId !== "string") {
      return NextResponse.json({ error: "invalid request" }, { status: 400 });
    }
    return NextResponse.json(await runResearch(s, body.participantId));
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "prepare failed" }, { status: 500 });
  }
}
