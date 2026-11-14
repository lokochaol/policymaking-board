import { NextResponse } from "next/server";
import type { MeetingState } from "@/lib/types";
import { runStep } from "@/lib/engine/step";

export const runtime = "nodejs";
export const maxDuration = 300;

function isState(s: unknown): s is MeetingState {
  const x = s as MeetingState | undefined;
  return !!x && typeof x === "object" && !!x.config && Array.isArray(x.config.participants) && x.config.participants.length > 0 && !!x.minutes && Array.isArray(x.utterances);
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as { state?: unknown };
    if (!isState(body?.state)) return NextResponse.json({ error: "invalid state" }, { status: 400 });
    return NextResponse.json(await runStep(body.state));
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "step failed" }, { status: 500 });
  }
}
