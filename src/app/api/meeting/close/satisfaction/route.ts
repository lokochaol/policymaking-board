import { NextResponse } from "next/server";
import { runCloseSatisfaction } from "@/lib/engine/close";
import { asState, stateBodySchema } from "@/lib/engine/inputs";
import { readBody } from "@/lib/engine/http";

export const runtime = "nodejs";
export const maxDuration = 300;

/** Close step 1. Response: { reports: SatisfactionReport[], usage } (usage is cumulative from state.usage). The client stores reports in state.closingReports. */
export async function POST(req: Request) {
  try {
    const b = await readBody(req, stateBodySchema);
    if ("res" in b) return b.res;
    return NextResponse.json(await runCloseSatisfaction(asState(b.data.state)));
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "satisfaction failed" }, { status: 500 });
  }
}
