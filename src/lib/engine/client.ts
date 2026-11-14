import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import type { z } from "zod";
import type { ModelTier, UsageTotals } from "@/lib/types";
import { MAX_TOKENS, addUsage, modelFor, type Effort, type EngineRole } from "./models";

let _client: Anthropic | null = null;

export function isMockMode(): boolean {
  return !process.env.ANTHROPIC_API_KEY || process.env.PMB_MOCK === "1";
}

export function getClient(): Anthropic {
  if (!_client) _client = new Anthropic();
  return _client;
}

export type SystemBlock = Anthropic.Messages.TextBlockParam;
export type SystemInput = string | SystemBlock[];

/** A system block with a cache breakpoint (1h TTL; all breakpoints use the same TTL so ordering rules hold). */
export function cachedBlock(text: string): SystemBlock {
  return { type: "text", text, cache_control: { type: "ephemeral", ttl: "1h" } };
}
export function plainBlock(text: string): SystemBlock {
  return { type: "text", text };
}

/** The request parameters of a structured call (exported so scripts can inspect the caching layout without sending). */
export function buildParams<T>(role: EngineRole, tier: ModelTier, system: SystemInput, user: string, schema: z.ZodType<T>, effort: Effort) {
  return {
    model: modelFor(role, tier),
    max_tokens: MAX_TOKENS[role],
    system,
    messages: [{ role: "user" as const, content: user }],
    output_config: { effort, format: zodOutputFormat(schema) },
  };
}

/**
 * One structured-output call. Returns null on refusal, parse failure or API error so the
 * caller can fall back (and show that it did). Usage is accumulated into `meter` when given.
 *
 * Caching: there is deliberately NO top-level cache_control (it would put the breakpoint after the
 * unique user message and never hit). Callers put explicit breakpoints on stable system blocks.
 * The closing call streams (max_tokens 64000 needs streaming) and reads parsed_output of finalMessage().
 */
export async function callStructured<T>(
  role: EngineRole,
  tier: ModelTier,
  system: SystemInput,
  user: string,
  schema: z.ZodType<T>,
  effort: Effort,
  meter?: UsageTotals,
): Promise<T | null> {
  const params = buildParams(role, tier, system, user, schema, effort);
  const model = params.model;
  try {
    const msg =
      role === "closing" ? await getClient().messages.stream(params).finalMessage() : await getClient().messages.parse(params);
    if (meter) addUsage(meter, model, msg.usage);
    if (msg.stop_reason === "refusal") {
      console.error(`[engine] ${role} refused`);
      return null;
    }
    const out = (msg.parsed_output as T | null) ?? null;
    if (out === null) console.error(`[engine] ${role} produced no parsed output (stop_reason=${msg.stop_reason})`);
    return out;
  } catch (e) {
    console.error(`[engine] ${role} call failed:`, e instanceof Error ? e.message : e);
    return null;
  }
}
