import { NextResponse } from "next/server";
import { runStep } from "@/lib/engine/step";
import { asState, stateBodySchema } from "@/lib/engine/inputs";
import { readBody } from "@/lib/engine/http";

export const runtime = "nodejs";
export const maxDuration = 300;

export async function POST(req: Request) {
  try {
    const b = await readBody(req, stateBodySchema);
    if ("res" in b) return b.res;
    return NextResponse.json(await runStep(asState(b.data.state)));
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "step failed" }, { status: 500 });
  }
}
