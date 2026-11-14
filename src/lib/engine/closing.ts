import { withContinuationSection, withDecisionsSection } from "./minutesFormat";
import type {
  Continuation,
  KeyExchange,
  MeetingOutcome,
  MeetingState,
  Participant,
  Proposal,
  SatisfactionReport,
  Stance,
  UsageTotals,
} from "@/lib/types";
import { callStructured, isMockMode } from "./client";
import { effortFor } from "./models";
import { mockOutcome, mockSatisfaction } from "./mock";
import { CLOSING_SYSTEM, closingUser, satisfactionSystem, satisfactionUser } from "./prompts";
import { closingSchema, satisfactionSchema } from "./schemas";
import { nameOf as nameOfId } from "./util";
import { tallyProposals, type ProposalTally } from "./tally";

const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));

export async function runSatisfaction(
  state: MeetingState,
  p: Participant,
  tallies: ProposalTally[],
  meter: UsageTotals,
): Promise<SatisfactionReport> {
  if (isMockMode()) return mockSatisfaction(state, p, tallies);
  const tier = state.config.modelTier;
  const r = await callStructured(
    "satisfaction",
    tier,
    satisfactionSystem(state, p),
    satisfactionUser(state, p, tallies),
    satisfactionSchema,
    effortFor("satisfaction", tier),
    meter,
  );
  if (!r) {
    const m = mockSatisfaction(state, p, tallies);
    return { ...m, comment: "（回答を控えた）", stanceShift: { ...m.stanceShift, reason: "回答が得られなかったため推定" } };
  }
  const pids = new Set(state.minutes.proposals.map((x) => x.id));
  const votes: Record<string, Stance> = {};
  for (const v of r.votes) if (pids.has(v.proposalId)) votes[v.proposalId] = v.stance;
  const score = clamp(Math.round(r.score), 0, 100);
  const consent = clamp(Math.round(r.consent), 1, 5) as 1 | 2 | 3 | 4 | 5;
  return { participantId: p.id, score, consent, agreedPoints: r.agreedPoints, disagreedPoints: r.disagreedPoints, remainingConcerns: r.remainingConcerns, hopes: r.hopes, comment: r.comment, stanceShift: { ...r.stanceShift, from: state.initialStances?.[p.id]?.stance ?? r.stanceShift.from }, votes };
}

export const DEGRADED_TITLE_SUFFIX = "（簡易版）";
export const DEGRADED_NOTICE = "【最終とりまとめに失敗（簡易版）】AIによる最終とりまとめが得られなかったため、議事録と集計結果から機械的に作成した簡易版です。再実行すると改善する場合があります。";

/** Marks a fallback outcome so it is never mistaken for the real write-up. */
function degrade(o: MeetingOutcome): MeetingOutcome {
  return {
    ...o,
    title: o.title + DEGRADED_TITLE_SUFFIX,
    executiveSummary: `${DEGRADED_NOTICE}\n${o.executiveSummary}`,
    unresolvedIssues: [DEGRADED_NOTICE, ...o.unresolvedIssues],
  };
}

export async function runClosing(
  state: MeetingState,
  reports: SatisfactionReport[],
  tallies: ProposalTally[],
  meter: UsageTotals,
): Promise<{ outcome: MeetingOutcome; degraded: boolean }> {
  const fallback = () => ({ outcome: mockOutcome(state, reports, tallies), degraded: false });
  if (isMockMode()) return fallback();
  const tier = state.config.modelTier;
  const r = await callStructured(
    "closing",
    tier,
    CLOSING_SYSTEM,
    closingUser(state, reports, tallies),
    closingSchema,
    effortFor("closing", tier),
    meter,
  );
  if (!r) return { outcome: degrade(mockOutcome(state, reports, tallies)), degraded: true };
  const ps = state.config.participants;
  const ids = new Set(ps.map((p) => p.id));
  const uids = new Set(state.utterances.map((u) => u.id));
  const existing = new Map(state.minutes.proposals.map((p) => [p.id, p]));
  const tallyBy = new Map(tallies.map((t) => [t.proposalId, t]));
  const decisions: Proposal[] = r.decisions.map((d) => {
    const old = existing.get(d.id);
    let t = tallyBy.get(d.id);
    if (!t) {
      // New (consolidated) item: still decided by code, from the support the model attributed.
      const support: Record<string, Stance> = Object.fromEntries(d.support.filter((x) => ids.has(x.participantId)).map((x) => [x.participantId, x.stance]));
      t = tallyProposals([{ ...d, proposedBy: d.proposedBy, support, history: [] }], ps, state.config.decisionRule, reports)[0];
    }
    return {
      id: d.id,
      title: d.title,
      body: d.body,
      proposedBy: old?.proposedBy ?? (ids.has(d.proposedBy) ? d.proposedBy : state.config.facilitatorId),
      kind: d.kind,
      status: t.status, // code-evaluated status wins
      support: t.stances, // the stances the tally actually used
      conditions: d.conditions.length ? d.conditions : undefined,
      history: old?.history ?? [],
    };
  });
  // Make sure every tallied proposal appears.
  for (const old of state.minutes.proposals)
    if (!decisions.some((d) => d.id === old.id)) {
      const t = tallyBy.get(old.id);
      decisions.push({ ...old, status: t?.status ?? old.status, support: t?.stances ?? old.support });
    }
  const claims = state.config.participants.map((p) => {
    const c = r.stakeholderClaims.find((x) => x.participantId === p.id);
    return { participantId: p.id, claim: c?.claim ?? "", coreInterest: c?.coreInterest ?? "" };
  });
  const keyExchanges: KeyExchange[] = r.keyExchanges.map((k) => ({
    ...k,
    utteranceIds: k.utteranceIds.filter((u) => uids.has(u)),
    participantIds: k.participantIds.filter((p) => ids.has(p)),
  }));
  const timeUp = !!state.clock?.timeUp;
  const c = r.continuation;
  const continuation: Continuation = {
    convergence: timeUp && c.convergence === "converged" ? "partially" : c.convergence,
    reachedPoint: c.reachedPoint,
    agreedSoFar: c.agreedSoFar,
    openIssues: c.openIssues,
    nextStartPoint: c.nextStartPoint,
    nextAgenda: c.nextAgenda,
    homework: c.homework.filter((h) => ids.has(h.participantId)),
    timeUp,
  };
  const outcome: MeetingOutcome = {
    title: r.title,
    executiveSummary: r.executiveSummary,
    decisions,
    landingZone: r.landingZone,
    stakeholderClaims: claims,
    keyExchanges,
    satisfaction: reports,
    unresolvedIssues: r.unresolvedIssues,
    nextSteps: r.nextSteps,
    continuation,
    minutesMarkdown: "",
  };
  outcome.minutesMarkdown = withContinuationSection(withDecisionsSection(r.minutesMarkdown, decisions), continuation, (id) => nameOfId(state, id));
  return { outcome, degraded: false };
}

