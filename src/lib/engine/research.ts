import type Anthropic from "@anthropic-ai/sdk";
import type { MeetingState, ResearchBrief, ResearchSource, UsageTotals } from "@/lib/types";
import { callStructured, getClient, isMockMode } from "./client";
import { mockBrief } from "./mock";
import { MAX_SEARCHES, addUsage, effortFor, modelFor } from "./models";
import { RESEARCH_FORMAT_SYSTEM, researchSystem, researchUser } from "./prompts";
import { researchFormatSchema } from "./schemas";
import { emptyUsage, registerCustomRoles } from "./util";

const MAX_CONTINUATIONS = 3;

export interface ResearchResult {
  brief: ResearchBrief;
  usage: UsageTotals;
}

/** Accumulated usage of this call only (the route adds it to state.usage). */
export async function runResearch(state: MeetingState, participantId: string): Promise<ResearchResult> {
  registerCustomRoles(state.config.customRoles);
  const p = state.config.participants.find((x) => x.id === participantId);
  if (!p) throw new Error(`unknown participant: ${participantId}`);
  const meter = emptyUsage();
  const base = (status: ResearchBrief["status"]): ResearchBrief => ({
    participantId,
    status,
    queries: [],
    approach: "",
    summary: "",
    keyFacts: [],
    talkingPoints: [],
    questionsToRaise: [],
    sources: [],
  });
  if (isMockMode()) return { brief: mockBrief(state, p), usage: meter };

  const tier = state.config.modelTier;
  const model = modelFor("research", tier);
  const isHaiku = model.includes("haiku");
  const tool = {
    type: isHaiku ? "web_search_20250305" : "web_search_20260209",
    name: "web_search",
    max_uses: MAX_SEARCHES[tier], // cost cap only
  } as unknown as Anthropic.Messages.ToolUnion;

  const queries: string[] = [];
  const sources: ResearchSource[] = [];
  const notes: string[] = [];
  try {
    const messages: Anthropic.Messages.MessageParam[] = [{ role: "user", content: researchUser(state, p) }];
    for (let i = 0; i <= MAX_CONTINUATIONS; i++) {
      const msg = await getClient().messages.create({
        model,
        max_tokens: 6000,
        system: researchSystem(p),
        messages,
        tools: [tool],
        output_config: { effort: effortFor("research", tier) },
      });
      addUsage(meter, model, msg.usage);
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
    console.error("[engine] research failed:", e instanceof Error ? e.message : e);
    if (!notes.length) return { brief: { ...base("failed"), queries, sources }, usage: meter };
  }
  const memo = notes.join("\n").trim();
  if (!memo) return { brief: { ...base("failed"), queries, sources }, usage: meter };

  const formatted = await callStructured(
    "research_format",
    tier,
    RESEARCH_FORMAT_SYSTEM,
    [`## ${p.name} のメモ`, memo, `## 実行した検索`, queries.join("\n") || "（なし）", `## 検索結果のURL`, sources.map((s) => `${s.title} ${s.url}`).join("\n") || "（なし）"].join("\n"),
    researchFormatSchema,
    "low",
    meter,
  );
  if (!formatted) {
    return { brief: { ...base("done"), queries, sources: sources.slice(0, 12), approach: "調べてメモにまとめた", summary: memo.slice(0, 600) }, usage: meter };
  }
  const bySource = new Map(sources.map((s) => [s.url, s]));
  return {
    brief: {
      participantId,
      status: "done",
      queries,
      approach: formatted.approach,
      summary: formatted.summary,
      keyFacts: formatted.keyFacts.map((f) => ({ fact: f.fact, source: bySource.get(f.sourceUrl) })),
      talkingPoints: formatted.talkingPoints,
      questionsToRaise: formatted.questionsToRaise,
      sources: sources.slice(0, 12),
    },
    usage: meter,
  };
}
