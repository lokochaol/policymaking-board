import { NextResponse } from "next/server";
import { runClose } from "@/lib/engine/close";
import { asState, stateBodySchema } from "@/lib/engine/inputs";
import { readBody } from "@/lib/engine/http";

export const runtime = "nodejs";
export const maxDuration = 300;

/**
 * Close step 2: the final write-up. Uses state.closingReports when present (from /close/satisfaction),
 * otherwise generates them first. Response: { outcome, usage, degraded }. `degraded: true` means the AI
 * write-up failed and `outcome` is a clearly marked simplified version (title/summary carry the marker).
 */
export async function POST(req: Request) {
  try {
    const b = await readBody(req, stateBodySchema);
    if ("res" in b) return b.res;
    return NextResponse.json(await runClose(asState(b.data.state)));
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "close failed" }, { status: 500 });
  }
}
