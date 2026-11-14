import type {
  KeyExchange,
  MeetingOutcome,
  MeetingState,
  Participant,
  Proposal,
  SatisfactionReport,
  UsageTotals,
} from "@/lib/types";
import { callStructured, isMockMode } from "./client";
import { effortFor } from "./models";
import { mockOutcome, mockSatisfaction } from "./mock";
import { CLOSING_SYSTEM, closingUser, satisfactionSystem, satisfactionUser } from "./prompts";
import { closingSchema, satisfactionSchema } from "./schemas";
import type { ProposalTally } from "./tally";

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
  const score = clamp(Math.round(r.score), 0, 100);
  const consent = clamp(Math.round(r.consent), 1, 5) as 1 | 2 | 3 | 4 | 5;
  return { participantId: p.id, score, consent, agreedPoints: r.agreedPoints, disagreedPoints: r.disagreedPoints, remainingConcerns: r.remainingConcerns, hopes: r.hopes, comment: r.comment, stanceShift: r.stanceShift };
}

export async function runClosing(
  state: MeetingState,
  reports: SatisfactionReport[],
  tallies: ProposalTally[],
  meter: UsageTotals,
): Promise<MeetingOutcome> {
  const fallback = () => mockOutcome(state, reports, tallies);
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
  if (!r) return fallback();
  const ids = new Set(state.config.participants.map((p) => p.id));
  const uids = new Set(state.utterances.map((u) => u.id));
  const existing = new Map(state.minutes.proposals.map((p) => [p.id, p]));
  const tallyBy = new Map(tallies.map((t) => [t.proposalId, t]));
  const decisions: Proposal[] = r.decisions.map((d) => {
    const old = existing.get(d.id);
    const t = tallyBy.get(d.id);
    return {
      id: d.id,
      title: d.title,
      body: d.body,
      proposedBy: old?.proposedBy ?? (ids.has(d.proposedBy) ? d.proposedBy : state.config.facilitatorId),
      kind: d.kind,
      status: t ? t.status : d.status, // code-evaluated status wins
      support: old?.support ?? Object.fromEntries(d.support.filter((s) => ids.has(s.participantId)).map((s) => [s.participantId, s.stance])),
      conditions: d.conditions.length ? d.conditions : undefined,
      history: old?.history ?? d.history,
    };
  });
  // Make sure every tallied proposal appears.
  for (const old of state.minutes.proposals)
    if (!decisions.some((d) => d.id === old.id)) decisions.push({ ...old, status: tallyBy.get(old.id)?.status ?? old.status });
  const claims = state.config.participants.map((p) => {
    const c = r.stakeholderClaims.find((x) => x.participantId === p.id);
    return { participantId: p.id, claim: c?.claim ?? "", coreInterest: c?.coreInterest ?? "" };
  });
  const keyExchanges: KeyExchange[] = r.keyExchanges.map((k) => ({
    ...k,
    utteranceIds: k.utteranceIds.filter((u) => uids.has(u)),
    participantIds: k.participantIds.filter((p) => ids.has(p)),
  }));
  return {
    title: r.title,
    executiveSummary: r.executiveSummary,
    decisions,
    landingZone: r.landingZone,
    stakeholderClaims: claims,
    keyExchanges,
    satisfaction: reports,
    unresolvedIssues: r.unresolvedIssues,
    nextSteps: r.nextSteps,
    minutesMarkdown: r.minutesMarkdown,
  };
}

