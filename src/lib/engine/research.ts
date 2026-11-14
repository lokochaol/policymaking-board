import type { MeetingState, ResearchBrief, UsageTotals } from "@/lib/types";
import { callStructured, isMockMode } from "./client";
import { mockBrief } from "./mock";
import { MAX_SEARCHES, effortFor, modelFor } from "./models";
import { RESEARCH_FORMAT_SYSTEM, researchSystem, researchUser } from "./prompts";
import { researchFormatSchema } from "./schemas";
import { emptyUsage } from "./util";
import { webResearch } from "./webSearch";

export interface ResearchResult {
  brief: ResearchBrief;
  usage: UsageTotals;
}

/** Accumulated usage of this call only (the route adds it to state.usage). */
export async function runResearch(state: MeetingState, participantId: string): Promise<ResearchResult> {
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
  const { memo: found, queries, sources } = await webResearch({
    model,
    system: researchSystem(state, p),
    user: researchUser(state, p),
    maxUses: MAX_SEARCHES[tier], // cost cap across continuations
    effort: effortFor("research", tier),
    meter,
    maxTokens: 6000,
  });
  const memo = found;
  if (!memo) return { brief: { ...base("failed"), queries, sources }, usage: meter };

  const formatted = await callStructured(
    "research_format",
    tier,
    RESEARCH_FORMAT_SYSTEM,
    [`## ${p.name} のメモ`, memo, `## 実行した検索`, queries.join("\n") || "（なし）", `## 検索結果のURL`, sources.map((x) => `${x.title} ${x.url}`).join("\n") || "（なし）"].join("\n"),
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
