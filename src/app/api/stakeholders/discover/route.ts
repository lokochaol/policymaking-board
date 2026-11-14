import { NextResponse } from "next/server";
import { runDiscover } from "@/lib/engine/discover";
import { discoverBodySchema } from "@/lib/engine/inputs";
import { readBody } from "@/lib/engine/http";

export const runtime = "nodejs";
export const maxDuration = 300;

export async function POST(req: Request) {
  try {
    const b = await readBody(req, discoverBodySchema);
    if ("res" in b) return b.res;
    const d = b.data;
    return NextResponse.json(
      await runDiscover({
        topic: d.topic.trim(),
        background: d.background,
        countryCodes: d.countryCodes,
        selectedRoleIds: d.selectedRoleIds,
        customRoles: d.customRoles,
        modelTier: d.modelTier,
      }),
    );
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "discover failed" }, { status: 500 });
  }
}
