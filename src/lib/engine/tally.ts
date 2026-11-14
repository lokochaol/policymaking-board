import type {
  DecisionRule,
  Participant,
  Proposal,
  ProposalStatus,
  SatisfactionReport,
  Stance,
} from "@/lib/types";
import { stanceToConsent } from "./util";

export interface ProposalTally {
  proposalId: string;
  status: ProposalStatus;
  counts: { strong_support: number; support: number; neutral: number; concern: number; oppose: number };
  total: number;
  supportRate: number; // 0-1, (strong_support+support)/total
  blockers: string[]; // participant ids who oppose
  /** The effective stance of every participant used for this tally (participant id -> stance). */
  stances: Record<string, Stance>;
  note: string; // Japanese description for prompts / UI
}

/** Mechanical evaluation of the decision rule (never delegated to the LLM). */
export function tallyProposals(
  proposals: Proposal[],
  participants: Participant[],
  rule: DecisionRule,
  reports: SatisfactionReport[] = [],
): ProposalTally[] {
  const votesOf = new Map(reports.map((r) => [r.participantId, r.votes]));
  return proposals.map((pr) => {
    const counts = { strong_support: 0, support: 0, neutral: 0, concern: 0, oppose: 0 };
    const blockers: string[] = [];
    const stances: Record<string, Stance> = {};
    for (const p of participants) {
      // Final vote (satisfaction survey) > stance stated in the meeting > neutral. Overall consent is never used to fill gaps.
      const s: Stance = votesOf.get(p.id)?.[pr.id] ?? pr.support[p.id] ?? "neutral";
      stances[p.id] = s;
      counts[s]++;
      if (s === "oppose") blockers.push(p.id);
    }
    const n = participants.length || 1;
    const approve = counts.strong_support + counts.support;
    const rate = approve / n;
    let status: ProposalStatus;
    switch (rule) {
      case "consensus":
        if (counts.oppose > 0) status = counts.oppose > n / 2 ? "rejected" : approve > 0 ? "both_views" : "deferred";
        else status = counts.concern > 0 ? "conditionally_agreed" : approve > 0 ? "agreed" : "deferred";
        break;
      case "unanimity":
        if (approve === n) status = "agreed";
        else status = counts.oppose > n / 2 ? "rejected" : "deferred";
        break;
      case "majority":
        status = approve > n / 2 ? "agreed" : counts.oppose + counts.concern > n / 2 ? "rejected" : "deferred";
        break;
      case "chair_discretion":
        if (counts.oppose === 0 && approve >= n / 2) status = counts.concern > 0 ? "conditionally_agreed" : "agreed";
        else status = approve > 0 ? "both_views" : "deferred";
        break;
      case "both_views":
        status = counts.oppose + counts.concern > 0 && approve > 0 ? "both_views" : approve > 0 ? "agreed" : "deferred";
        break;
      case "vote_ranked":
        status = rate >= 0.67 ? "agreed" : rate >= 0.5 ? "conditionally_agreed" : "rejected";
        break;
      default:
        status = "deferred";
    }
    const note =
      `賛成${approve}（強く賛成${counts.strong_support}）・中立${counts.neutral}・懸念${counts.concern}・反対${counts.oppose}／${n}人、` +
      `賛成率${Math.round(rate * 100)}%。判定：${status}`;
    return { proposalId: pr.id, status, counts, total: n, supportRate: rate, blockers, stances, note };
  });
}

export function consentFromStance(s: Stance) {
  return stanceToConsent(s);
}
