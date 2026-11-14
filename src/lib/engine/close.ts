import type { MeetingOutcome, MeetingState, UsageTotals } from "@/lib/types";
import { runClosing, runSatisfaction } from "./closing";
import { tallyProposals } from "./tally";
import { registerCustomRoles } from "./util";

export async function runClose(state: MeetingState): Promise<{ outcome: MeetingOutcome; usage: UsageTotals }> {
  registerCustomRoles(state.config.customRoles);
  const meter: UsageTotals = { ...state.usage };
  const ps = state.config.participants;
  const rule = state.config.decisionRule;
  // 1. Self-reported satisfaction, in parallel.
  const prelim = tallyProposals(state.minutes.proposals, ps, rule);
  const reports = await Promise.all(ps.map((p) => runSatisfaction(state, p, prelim, meter)));
  // 2. Mechanical decision-rule evaluation (consent reports fill in missing stances), then the final write-up.
  const tallies = tallyProposals(state.minutes.proposals, ps, rule, reports);
  const outcome = await runClosing(state, reports, tallies, meter);
  return { outcome, usage: meter };
}
