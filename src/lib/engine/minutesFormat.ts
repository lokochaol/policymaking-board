import type { Continuation, Proposal, ProposalStatus } from "@/lib/types";

const STATUS_JA: Record<ProposalStatus, string> = {
  draft: "提案中",
  discussing: "検討中",
  agreed: "合意",
  conditionally_agreed: "条件付き合意",
  both_views: "両論併記",
  rejected: "否決",
  deferred: "継続審議",
};

/** Decisions section generated from code-evaluated statuses (the LLM never states them). */
export function decisionsSection(decisions: Proposal[]): string {
  const lines = ["## 決定事項"];
  if (!decisions.length) lines.push("- なし");
  for (const d of decisions) {
    lines.push(`- **${d.title}**（${STATUS_JA[d.status]}）`);
    for (const c of d.conditions ?? []) lines.push(`  - 条件：${c}`);
  }
  return lines.join("\n");
}

/** Replace (or insert) the 決定事項 section in LLM-written minutes with the code-generated one. */
export function withDecisionsSection(markdown: string, decisions: Proposal[]): string {
  const section = decisionsSection(decisions);
  const re = /^##\s*決定事項[^\n]*\n[\s\S]*?(?=^##\s|(?![\s\S]))/m;
  if (re.test(markdown)) return markdown.replace(re, section + "\n\n");
  const next = markdown.search(/^##\s*今後の予定/m);
  if (next >= 0) return markdown.slice(0, next) + section + "\n\n" + markdown.slice(next);
  return markdown.trimEnd() + "\n\n" + section + "\n";
}

const CONVERGENCE_JA: Record<Continuation["convergence"], string> = {
  converged: "収束",
  partially: "一部収束",
  not_converged: "未収束",
};
export const convergenceLabel = (c: Continuation["convergence"]) => CONVERGENCE_JA[c];

/** 次回への持ち越し section, generated from the structured Continuation (the LLM never writes it as prose). */
export function continuationSection(c: Continuation, nameOf: (id: string) => string): string {
  const lines = ["## 次回への持ち越し", `- 到達度：${CONVERGENCE_JA[c.convergence]}${c.timeUp ? "（時間切れ）" : ""}`, `- 到達点：${c.reachedPoint}`];
  const list = (title: string, xs: string[]) => {
    lines.push(`- ${title}`);
    if (!xs.length) lines.push("  - なし");
    for (const x of xs) lines.push(`  - ${x}`);
  };
  list("ここまでに合意できたこと", c.agreedSoFar);
  list("残った論点", c.openIssues);
  lines.push(`- 次回の出発点：${c.nextStartPoint}`);
  list("次回の議題案", c.nextAgenda);
  if (c.homework.length) {
    lines.push("- 次回までの宿題");
    for (const h of c.homework) lines.push(`  - ${nameOf(h.participantId)}：${h.task}`);
  }
  return lines.join("\n");
}

/** Replace (or insert) the 次回への持ち越し section in the minutes. */
export function withContinuationSection(markdown: string, c: Continuation, nameOf: (id: string) => string): string {
  const section = continuationSection(c, nameOf);
  const re = /^##\s*次回への持ち越し[^\n]*\n[\s\S]*?(?=^##\s|(?![\s\S]))/m;
  if (re.test(markdown)) return markdown.replace(re, section + "\n\n");
  const next = markdown.search(/^##\s*今後の予定/m);
  if (next >= 0) return markdown.slice(0, next) + section + "\n\n" + markdown.slice(next);
  return markdown.trimEnd() + "\n\n" + section + "\n";
}
