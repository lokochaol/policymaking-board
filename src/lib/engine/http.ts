import { NextResponse } from "next/server";
import type { z } from "zod";

/**
 * Optional shared-secret guard for deployments behind their own auth: when PMB_ACCESS_TOKEN is set, every
 * API call must carry the same value in the `x-pmb-token` header (the browser client does not send it; add it at
 * a reverse proxy / middleware instead). When unset, no check is made.
 */
function denied(req: Request): NextResponse | null {
  const token = process.env.PMB_ACCESS_TOKEN;
  if (token && req.headers.get("x-pmb-token") !== token) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  return null;
}

const MAX_BODY_BYTES = 8 * 1024 * 1024;

/** Reads and validates a JSON body. Returns the parsed data, or a ready-made error response. */
export async function readBody<S extends z.ZodType>(req: Request, schema: S): Promise<{ data: z.infer<S> } | { res: NextResponse }> {
  const d = denied(req);
  if (d) return { res: d };
  const len = Number(req.headers.get("content-length") ?? 0);
  if (len > MAX_BODY_BYTES) return { res: NextResponse.json({ error: "payload too large" }, { status: 413 }) };
  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return { res: NextResponse.json({ error: "invalid JSON" }, { status: 400 }) };
  }
  const r = schema.safeParse(json);
  if (!r.success) {
    const issue = r.error.issues[0];
    return { res: NextResponse.json({ error: `invalid request: ${issue?.path.join(".") ?? ""} ${issue?.message ?? ""}`.trim() }, { status: 400 }) };
  }
  return { data: r.data };
}
