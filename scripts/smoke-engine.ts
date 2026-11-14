// Run: npx tsx scripts/smoke-engine.ts   (forces mock mode unless PMB_REAL=1)
import { createParticipant } from "../src/lib/participants";
import { getMeetingType } from "../src/data/meetingTypes";
import { runStep } from "../src/lib/engine/step";
import { runClose } from "../src/lib/engine/close";
import { runResearch } from "../src/lib/engine/research";
import type { MeetingState } from "../src/lib/types";

async function main() {
  if (process.env.PMB_REAL !== "1") process.env.PMB_MOCK = "1";
  const type = getMeetingType("council");
  const specs: [string, string][] = [["jhs_student", "JP"], ["bus_driver", "JP"], ["jhs_student", "JP"], ["bus_driver", "JP"]];
  const participants = specs.map(([r, c], i) => createParticipant(r, c, `smoke-${i}`, i));
  participants[1].isFacilitator = true;
  let state: MeetingState = {
    config: {
      id: "smoke",
      createdAt: new Date().toISOString(),
      topic: "高校の部活動の地域移行",
      meetingTypeId: type.id,
      disclosure: type.disclosure,
      decisionRule: type.decisionRule,
      participants,
      facilitatorId: participants[1].id,
      modelTier: "standard",
      lengthFactor: 1,
      customRoles: [],
    },
    status: "preparing",
    phaseIndex: 0,
    turn: 0,
    phaseTurn: 0,
    utterances: [],
    minutes: { summary: "", agendaItems: [], issues: [], proposals: [], keyExchanges: [], coveredThroughTurn: 0 },
    research: {},
    initialStances: {},
    usage: { inputTokens: 0, outputTokens: 0, cacheReadTokens: 0, estimatedCostUsd: 0 },
  };

  const research = await Promise.all(participants.map((p) => runResearch(state, p.id)));
  for (const r of research) state.research[r.brief.participantId] = r.brief;
  state.status = "running";
  console.log(`research: ${research.map((r) => r.brief.status).join(",")}`);

  let guard = 0;
  while (state.status === "running" && guard++ < 200) {
    const r = await runStep(state);
    state = {
      ...state,
      utterances: [...state.utterances, ...r.utterances],
      minutes: r.minutes ?? state.minutes,
      phaseIndex: r.phaseIndex,
      phaseTurn: r.phaseTurn,
      turn: r.turn,
      status: r.status,
      initialStances: r.initialStances ?? state.initialStances,
      pendingDirective: undefined,
      usage: r.usage,
    };
    const u = r.utterances[r.utterances.length - 1];
    const who = participants.find((p) => p.id === u.speakerId)?.name;
    console.log(`t${r.turn} [${type.phases[Math.min(r.phaseIndex, type.phases.length - 1)].name}] ${who}: ${u.text.slice(0, 50)}`);
  }
  // Check: nobody speaks 3 times in a row.
  const main = state.utterances.filter((u) => !u.id.endsWith("_f")).map((u) => u.speakerId);
  for (let i = 2; i < main.length; i++) if (main[i] === main[i - 1] && main[i] === main[i - 2]) console.log("WARN: 3 in a row at", i);

  const { outcome, usage } = await runClose(state);
  console.log("\n=== SUMMARY ===");
  console.log(`status=${state.status} turns=${state.turn} utterances=${state.utterances.length}`);
  console.log(`proposals=${state.minutes.proposals.length} issues=${state.minutes.issues.length} keyExchanges=${state.minutes.keyExchanges.length}`);
  console.log(`outcome: ${outcome.title} decisions=${outcome.decisions.map((d) => d.status).join(",")}`);
  console.log(`satisfaction: ${outcome.satisfaction.map((s) => `${s.score}/c${s.consent}`).join(" ")}`);
  console.log(`usage:`, usage);
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});
