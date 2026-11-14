import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import type { z } from "zod";
import type { ModelTier, UsageTotals } from "@/lib/types";
import { addUsage, modelFor, type Effort, type EngineRole } from "./models";

let _client: Anthropic | null = null;

export function isMockMode(): boolean {
  return !process.env.ANTHROPIC_API_KEY || process.env.PMB_MOCK === "1";
}

export function getClient(): Anthropic {
  if (!_client) _client = new Anthropic();
  return _client;
}

/**
 * One structured-output call. Returns null on refusal, parse failure or API error so the
 * meeting can carry on with a fallback. Usage is accumulated into `meter` when given.
 */
export async function callStructured<T>(
  role: EngineRole,
  tier: ModelTier,
  system: string,
  user: string,
  schema: z.ZodType<T>,
  effort: Effort,
  meter?: UsageTotals,
): Promise<T | null> {
  const model = modelFor(role, tier);
  try {
    const msg = await getClient().messages.parse({
      model,
      max_tokens: role === "closing" ? 16000 : 4000,
      system,
      messages: [{ role: "user", content: user }],
      cache_control: { type: "ephemeral" },
      output_config: { effort, format: zodOutputFormat(schema) },
    });
    if (meter) addUsage(meter, model, msg.usage);
    if (msg.stop_reason === "refusal") return null;
    return (msg.parsed_output as T | null) ?? null;
  } catch (e) {
    console.error(`[engine] ${role} call failed:`, e instanceof Error ? e.message : e);
    return null;
  }
}
