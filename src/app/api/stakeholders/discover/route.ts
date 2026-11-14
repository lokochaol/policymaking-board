import { NextResponse } from "next/server";
import type { ModelTier, RoleTemplate } from "@/lib/types";
import { registerCustomRoles } from "@/data/roles";
import { runDiscover } from "@/lib/engine/discover";

export const runtime = "nodejs";
export const maxDuration = 300;

const TIERS: ModelTier[] = ["economy", "standard", "premium"];

export async function POST(req: Request) {
  try {
    const b = (await req.json()) as {
      topic?: unknown; background?: unknown; countryCodes?: unknown; selectedRoleIds?: unknown; customRoles?: unknown; modelTier?: unknown;
    };
    const strs = (v: unknown) => Array.isArray(v) && v.every((x) => typeof x === "string");
    if (typeof b?.topic !== "string" || !b.topic.trim()) return NextResponse.json({ error: "topic is required" }, { status: 400 });
    if (!strs(b.countryCodes ?? []) || !strs(b.selectedRoleIds ?? [])) return NextResponse.json({ error: "invalid request" }, { status: 400 });
    const customRoles = (Array.isArray(b.customRoles) ? b.customRoles : []) as RoleTemplate[];
    registerCustomRoles(customRoles);
    const modelTier = TIERS.includes(b.modelTier as ModelTier) ? (b.modelTier as ModelTier) : "standard";
    const res = await runDiscover({
      topic: b.topic.trim(),
      background: typeof b.background === "string" ? b.background : undefined,
      countryCodes: (b.countryCodes as string[] | undefined) ?? [],
      selectedRoleIds: (b.selectedRoleIds as string[] | undefined) ?? [],
      customRoles,
      modelTier,
    });
    return NextResponse.json(res);
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "discover failed" }, { status: 500 });
  }
}
