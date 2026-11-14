import { NextResponse } from "next/server";
import type { ModelTier, RoleCategory } from "@/lib/types";
import { CATEGORY_LABELS } from "@/data/roles";
import { runCreateRole } from "@/lib/engine/createRole";

export const runtime = "nodejs";
export const maxDuration = 300;

const TIERS: ModelTier[] = ["economy", "standard", "premium"];

export async function POST(req: Request) {
  try {
    const b = (await req.json()) as Record<string, unknown>;
    if (typeof b?.title !== "string" || !b.title.trim() || typeof b.sketch !== "string" || typeof b.topic !== "string") {
      return NextResponse.json({ error: "invalid request" }, { status: 400 });
    }
    if (typeof b.category !== "string" || !(b.category in CATEGORY_LABELS)) return NextResponse.json({ error: "invalid category" }, { status: 400 });
    const res = await runCreateRole({
      title: b.title.trim(),
      category: b.category as RoleCategory,
      sketch: b.sketch,
      topic: b.topic,
      countryCode: typeof b.countryCode === "string" ? b.countryCode : undefined,
      modelTier: TIERS.includes(b.modelTier as ModelTier) ? (b.modelTier as ModelTier) : "standard",
    });
    return NextResponse.json(res);
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "create-role failed" }, { status: 500 });
  }
}
