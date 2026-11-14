import type { MeetingOutcome, MeetingState, SatisfactionReport, UsageTotals } from "@/lib/types";
import { runClosing, runSatisfaction } from "./closing";
import { tallyProposals } from "./tally";

/** Close step 1: every participant's satisfaction report + final votes (parallel). Usage is cumulative (starts from state.usage). */
export async function runCloseSatisfaction(state: MeetingState): Promise<{ reports: SatisfactionReport[]; usage: UsageTotals }> {
  const meter: UsageTotals = { ...state.usage };
  const ps = state.config.participants;
  const prelim = tallyProposals(state.minutes.proposals, ps, state.config.decisionRule);
  const reports = await Promise.all(ps.map((p) => runSatisfaction(state, p, prelim, meter)));
  return { reports, usage: meter };
}

/** Close step 2: mechanical tally, then the final write-up. Uses state.closingReports when complete, else generates them. */
export async function runClose(state: MeetingState): Promise<{ outcome: MeetingOutcome; usage: UsageTotals; degraded: boolean }> {
  const ps = state.config.participants;
  const rule = state.config.decisionRule;
  let reports = state.closingReports;
  let meter: UsageTotals = { ...state.usage };
  if (!reports || !ps.every((p) => reports!.some((r) => r.participantId === p.id))) {
    const s1 = await runCloseSatisfaction(state);
    reports = s1.reports;
    meter = s1.usage;
  }
  const tallies = tallyProposals(state.minutes.proposals, ps, rule, reports);
  const { outcome, degraded } = await runClosing(state, reports, tallies, meter);
  return { outcome, usage: meter, degraded };
}
