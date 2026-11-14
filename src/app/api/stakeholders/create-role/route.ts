import { NextResponse } from "next/server";
import { runCreateRole } from "@/lib/engine/createRole";
import { createRoleBodySchema } from "@/lib/engine/inputs";
import { readBody } from "@/lib/engine/http";

export const runtime = "nodejs";
export const maxDuration = 300;

export async function POST(req: Request) {
  try {
    const b = await readBody(req, createRoleBodySchema);
    if ("res" in b) return b.res;
    const d = b.data;
    return NextResponse.json(await runCreateRole({ ...d, title: d.title.trim() }));
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "create-role failed" }, { status: 500 });
  }
}
