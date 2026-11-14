import type { Proposal, ProposalStatus } from "@/lib/types";

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
