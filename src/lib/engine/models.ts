import type { ModelTier, UsageTotals } from "@/lib/types";

export type EngineRole =
  | "speaker"
  | "facilitator"
  | "scribe"
  | "stances"
  | "satisfaction"
  | "closing"
  | "research"
  | "research_format";

const H = "claude-haiku-5-5";
const S = "claude-sonnet-5-5";
const O = "claude-opus-5-5";

export const MODEL_TABLE: Record<EngineRole, Record<ModelTier, string>> = {
  speaker: { economy: H, standard: S, premium: S },
  facilitator: { economy: H, standard: S, premium: O },
  scribe: { economy: H, standard: H, premium: S },
  stances: { economy: H, standard: H, premium: S },
  satisfaction: { economy: H, standard: S, premium: S },
  closing: { economy: S, standard: O, premium: O },
  research: { economy: H, standard: S, premium: S },
  research_format: { economy: H, standard: H, premium: H },
};

export function modelFor(role: EngineRole, tier: ModelTier): string {
  return MODEL_TABLE[role][tier];
}

export type Effort = "low" | "medium" | "high";

export function effortFor(role: EngineRole, tier: ModelTier): Effort {
  if (role === "closing") return "high";
  if (role === "facilitator" && tier === "premium") return "medium";
  return "low";
}

/** USD per million tokens: [input, output]. */
export const PRICING: Record<string, [number, number]> = {
  [O]: [4, 20],
  [S]: [2, 10],
  [H]: [0.1, 0.5],
};

export const WEB_SEARCH_USD_PER_REQUEST = 0.01;

export const MAX_SEARCHES: Record<ModelTier, number> = { economy: 3, standard: 6, premium: 10 };

export interface RawUsage {
  input_tokens?: number | null;
  output_tokens?: number | null;
  cache_read_input_tokens?: number | null;
  cache_creation_input_tokens?: number | null;
  server_tool_use?: { web_search_requests?: number | null } | null;
}

export function costOf(model: string, u: RawUsage): number {
  const [pin, pout] = PRICING[model] ?? PRICING[S];
  const input = u.input_tokens ?? 0;
  const out = u.output_tokens ?? 0;
  const cr = u.cache_read_input_tokens ?? 0;
  const cw = u.cache_creation_input_tokens ?? 0;
  const searches = u.server_tool_use?.web_search_requests ?? 0;
  return (
    (input * pin + cr * pin * 0.1 + cw * pin * 1.25 + out * pout) / 1_000_000 + searches * WEB_SEARCH_USD_PER_REQUEST
  );
}

export function addUsage(meter: UsageTotals, model: string, u: RawUsage): void {
  meter.inputTokens += (u.input_tokens ?? 0) + (u.cache_creation_input_tokens ?? 0);
  meter.outputTokens += u.output_tokens ?? 0;
  meter.cacheReadTokens += u.cache_read_input_tokens ?? 0;
  meter.estimatedCostUsd += costOf(model, u);
}
