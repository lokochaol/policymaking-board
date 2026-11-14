import { NextResponse } from "next/server";
import { runResearch } from "@/lib/engine/research";
import { asState, prepareBodySchema } from "@/lib/engine/inputs";
import { readBody } from "@/lib/engine/http";

export const runtime = "nodejs";
export const maxDuration = 300;

export async function POST(req: Request) {
  try {
    const b = await readBody(req, prepareBodySchema);
    if ("res" in b) return b.res;
    return NextResponse.json(await runResearch(asState(b.data.state), b.data.participantId));
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "prepare failed" }, { status: 500 });
  }
}
