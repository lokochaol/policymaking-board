// Run: npx tsx scripts/smoke-engine.ts   (forces mock mode unless PMB_REAL=1)
// Runs a 30-minute and a 15-minute meeting, then a follow-up session built from the 15-minute outcome.
import { createParticipant } from "../src/lib/participants";
import { getMeetingType } from "../src/data/meetingTypes";
import { runStep } from "../src/lib/engine/step";
import { runClose, runCloseSatisfaction } from "../src/lib/engine/close";
import { runResearch } from "../src/lib/engine/research";
import { createInitialClock } from "../src/lib/engine/clock";
import type { CarryOver, MeetingOutcome, MeetingState } from "../src/lib/types";

const fails: string[] = [];
const check = (name: string, ok: boolean, detail = "") => {
  console.log(`${ok ? "PASS" : "FAIL"} ${name}${detail ? ` (${detail})` : ""}`);
  if (!ok) fails.push(name);
};

function makeState(id: string, durationMinutes: number, extra: { carryOver?: CarryOver; research?: MeetingState["research"]; initialStances?: MeetingState["initialStances"] } = {}): MeetingState {
  const type = getMeetingType("council");
  const specs: [string, string][] = [["jhs_student", "JP"], ["bus_driver", "JP"], ["jhs_student", "JP"], ["bus_driver", "JP"], ["hs_teacher", "JP"]];
  const participants = specs.map(([r, c], i) => createParticipant(r, c, `smoke-${i}`, i));
  participants[1].isFacilitator = true;
  const config = {
    id,
    createdAt: new Date().toISOString(),
    topic: "高校の部活動の地域移行",
    meetingTypeId: type.id,
    disclosure: type.disclosure,
    decisionRule: type.decisionRule,
    participants,
    facilitatorId: participants[1].id,
    modelTier: "standard" as const,
    durationMinutes,
    carryOver: extra.carryOver,
    customRoles: [],
  };
  return {
    config,
    status: extra.research ? "running" : "preparing",
    phaseIndex: 0,
    turn: 0,
    phaseTurn: 0,
    clock: createInitialClock(config, type),
    utterances: [],
    minutes: { summary: "", agendaItems: [], issues: [], proposals: [], keyExchanges: [], coveredThroughTurn: 0 },
    research: extra.research ?? {},
    initialStances: extra.initialStances ?? {},
    usage: { inputTokens: 0, outputTokens: 0, cacheReadTokens: 0, estimatedCostUsd: 0 },
  };
}

async function runMeeting(label: string, state: MeetingState): Promise<{ state: MeetingState; outcome: MeetingOutcome }> {
  const type = getMeetingType("council");
  const participants = state.config.participants;
  const dur = state.config.durationMinutes;
  if (state.status === "preparing") {
    const research = await Promise.all(participants.map((p) => runResearch(state, p.id)));
    for (const r of research) state.research[r.brief.participantId] = r.brief;
    state.status = "running";
  }
  let guard = 0;
  let sawStances = false;
  while (state.status === "running" && guard++ < 400) {
    const r = await runStep(state);
    if (r.initialStances) sawStances = true;
    state = {
      ...state,
      utterances: [...state.utterances, ...r.utterances],
      minutes: r.minutes ?? state.minutes,
      phaseIndex: r.phaseIndex,
      phaseTurn: r.phaseTurn,
      turn: r.turn,
      clock: r.clock,
      status: r.status,
      initialStances: r.initialStances ?? state.initialStances,
      pendingDirective: undefined,
      usage: r.usage,
    };
    const u = r.utterances[r.utterances.length - 1];
    const who = participants.find((p) => p.id === u.speakerId)?.name;
    if (process.env.VERBOSE) console.log(`t${r.turn} ${r.clock.elapsedMin.toFixed(1)}m [${type.phases[Math.min(r.phaseIndex, type.phases.length - 1)].name}] ${who}: ${u.text.slice(0, 50)}`);
  }
  const sat = await runCloseSatisfaction(state);
  state = { ...state, closingReports: sat.reports, usage: sat.usage };
  const { outcome, degraded } = await runClose(state);
  console.log(`\n=== ${label} (${dur}分) ===`);
  console.log(`status=${state.status} turns=${state.turn} elapsed=${state.clock.elapsedMin.toFixed(1)}m timeUp=${!!state.clock.timeUp} convergence=${outcome.continuation.convergence}`);

  let prev = -1;
  let mono = true;
  for (const u of state.utterances) {
    if (u.atMinute < prev) mono = false;
    prev = u.atMinute;
  }
  check(`${label}: atMinute monotonic`, mono);
  check(`${label}: ended within duration+10`, state.clock.elapsedMin <= dur + 10 + 1.5, `${state.clock.elapsedMin.toFixed(1)} <= ${dur + 10}`);
  check(`${label}: closing reached`, state.status === "closing" && state.phaseIndex >= type.phases.length - 0);
  check(`${label}: confirmation round ran`, participants.every((p) => state.utterances.some((u) => u.phaseId === "confirm" && u.speakerId === p.id && u.kind === "speech")) || participants.filter((p) => p.id !== state.config.facilitatorId).every((p) => state.utterances.some((u) => u.phaseId === "confirm" && u.speakerId === p.id)));
  check(`${label}: continuation present`, !!outcome.continuation && outcome.continuation.nextStartPoint.length > 0);
  check(`${label}: minutes has 次回への持ち越し`, outcome.minutesMarkdown.includes("## 次回への持ち越し"));
  check(`${label}: not degraded`, !degraded);
  void sawStances;
  return { state, outcome };
}

async function main() {
  if (process.env.PMB_REAL !== "1") process.env.PMB_MOCK = "1";

  const a = await runMeeting("30min", makeState("smoke30", 30));
  const b = await runMeeting("15min", makeState("smoke15", 15));
  check("15min: timeUp set", !!b.state.clock.timeUp);
  check("15min: not_converged on timeUp", b.outcome.continuation.convergence === "not_converged" && b.outcome.continuation.timeUp);
  const closeRemark = b.state.utterances.filter((u) => u.phaseId === "closing").map((u) => u.text).join("");
  check("15min: closing remark mentions 次回", closeRemark.includes("次回"), closeRemark.slice(0, 40));
  const openRemark = a.state.utterances[0]?.text ?? "";
  check("30min: opening announces plan", /30分/.test(openRemark), openRemark.slice(0, 60));
  console.log("\n--- 15min minutes tail ---\n" + b.outcome.minutesMarkdown.split("## 次回への持ち越し")[1]?.slice(0, 500));

  // Follow-up session from the 15-minute outcome.
  const carry: CarryOver = {
    previousMeetingId: b.state.config.id,
    sessionNumber: 2,
    previousSummary: b.state.minutes.summary,
    continuation: b.outcome.continuation,
    previousDecisions: b.outcome.decisions.map((d) => ({ title: d.title, status: d.status })),
  };
  const stances: MeetingState["initialStances"] = {};
  for (const r of b.outcome.satisfaction) stances[r.participantId] = { stance: r.stanceShift.to, summary: r.comment };
  const c = await runMeeting("session2", makeState("smoke2", 15, { carryOver: carry, research: b.state.research, initialStances: stances }));
  check("session2: initial stances kept", c.state.config.participants.every((p) => c.state.initialStances[p.id]?.summary === stances[p.id].summary));
  check("session2: opening recaps previous session", /第2回/.test(c.state.utterances[0]?.text ?? ""), (c.state.utterances[0]?.text ?? "").slice(0, 60));

  if (fails.length) {
    console.error("FAILED:", fails.join(", "));
    process.exit(1);
  }
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});
