import type Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import type { z } from "zod";
import type { UsageTotals } from "@/lib/types";
import { getClient } from "./client";
import { addUsage, type Effort } from "./models";

const MAX_CONTINUATIONS = 3;

export interface WebNotes {
  memo: string;
  queries: string[];
  sources: { title: string; url: string }[];
}

/** Free-form web-search research call (pause_turn continuation). Never throws; returns what it got. */
export async function webResearch(opts: {
  model: string;
  system: string;
  user: string;
  maxUses: number;
  effort: Effort;
  meter: UsageTotals;
  maxTokens?: number;
}): Promise<WebNotes> {
  const isHaiku = opts.model.includes("haiku");
  const tool = {
    type: isHaiku ? "web_search_20250305" : "web_search_20260209",
    name: "web_search",
    max_uses: opts.maxUses,
  } as unknown as Anthropic.Messages.ToolUnion;
  const queries: string[] = [];
  const sources: { title: string; url: string }[] = [];
  const notes: string[] = [];
  try {
    const messages: Anthropic.Messages.MessageParam[] = [{ role: "user", content: opts.user }];
    for (let i = 0; i <= MAX_CONTINUATIONS; i++) {
      const msg = await getClient().messages.create({
        model: opts.model,
        max_tokens: opts.maxTokens ?? 8000,
        system: opts.system,
        messages,
        tools: [tool],
        output_config: { effort: opts.effort },
      });
      addUsage(opts.meter, opts.model, msg.usage);
      for (const b of msg.content) {
        if (b.type === "text") notes.push(b.text);
        else if (b.type === "server_tool_use" && b.name === "web_search") {
          const q = (b.input as { query?: unknown } | null)?.query;
          if (typeof q === "string") queries.push(q);
        } else if (b.type === "web_search_tool_result" && Array.isArray(b.content)) {
          for (const r of b.content) if (!sources.some((s) => s.url === r.url)) sources.push({ title: r.title, url: r.url });
        }
      }
      if (msg.stop_reason !== "pause_turn") break;
      messages.push({ role: "assistant", content: msg.content as Anthropic.Messages.ContentBlockParam[] });
    }
  } catch (e) {
    console.error("[engine] web research failed:", e instanceof Error ? e.message : e);
  }
  return { memo: notes.join("\n").trim(), queries, sources };
}

/** Structured-output call with an explicit model id. Returns null on refusal / failure. */
export async function parseStructured<T>(opts: {
  model: string;
  system: string;
  user: string;
  schema: z.ZodType<T>;
  effort: Effort;
  meter: UsageTotals;
  maxTokens?: number;
}): Promise<T | null> {
  try {
    const msg = await getClient().messages.parse({
      model: opts.model,
      max_tokens: opts.maxTokens ?? 8000,
      system: opts.system,
      messages: [{ role: "user", content: opts.user }],
      output_config: { effort: opts.effort, format: zodOutputFormat(opts.schema) },
    });
    addUsage(opts.meter, opts.model, msg.usage);
    if (msg.stop_reason === "refusal") return null;
    return (msg.parsed_output as T | null) ?? null;
  } catch (e) {
    console.error("[engine] structured call failed:", e instanceof Error ? e.message : e);
    return null;
  }
}
