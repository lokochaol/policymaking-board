import type { FacilitatorDecision, MeetingState, Participant, PhaseDef, UsageTotals } from "@/lib/types";
import { callStructured, isMockMode } from "./client";
import { effortFor } from "./models";
import { mockFacilitatorFree, mockFacilitatorLite } from "./mock";
import { facilitatorSystem, facilitatorUser, type FacilitatorCtx } from "./prompts";
import { facilitatorLiteSchema, facilitatorSchema } from "./schemas";
import { facilitatorOf, isFacilitatorLed, nameOf } from "./util";

export interface TurnCtx {
  phase: PhaseDef;
  phaseIndex: number;
  budget: number;
  phaseTurn: number;
  counts: Record<string, number>;
}

/** Ids of the main speakers (excluding the facilitator's separate remark utterances), oldest first. */
function mainSpeakers(state: MeetingState): string[] {
  return state.utterances.filter((u) => !u.id.endsWith("_f")).map((u) => u.speakerId);
}

function eligible(state: MeetingState, ctx: TurnCtx, ps: Participant[]): Participant[] {
  const last = mainSpeakers(state).slice(-2);
  const blocked = last.length === 2 && last[0] === last[1] ? last[1] : undefined;
  const pool = ps.filter((p) => p.id !== blocked);
  return pool.length ? pool : ps;
}

function leastSpoken(state: MeetingState, ctx: TurnCtx, ps: Participant[]): Participant {
  const last = mainSpeakers(state).slice(-1)[0];
  const pool = eligible(state, ctx, ps);
  const notLast = pool.filter((p) => p.id !== last);
  const cands = notLast.length ? notLast : pool;
  return [...cands].sort((a, b) => (ctx.counts[a.id] ?? 0) - (ctx.counts[b.id] ?? 0) || a.seatIndex - b.seatIndex)[0];
}

function pickRoundRobin(state: MeetingState, ctx: TurnCtx): Participant {
  const fac = state.config.facilitatorId;
  const spoken = new Set(
    state.utterances.filter((u) => u.phaseId === ctx.phase.id && !u.id.endsWith("_f")).map((u) => u.speakerId),
  );
  const order = [...state.config.participants].sort(
    (a, b) => Number(a.id === fac) - Number(b.id === fac) || a.seatIndex - b.seatIndex,
  );
  const pool = eligible(state, ctx, order);
  return pool.find((p) => !spoken.has(p.id)) ?? leastSpoken(state, ctx, order);
}

export async function decideNext(state: MeetingState, ctx: TurnCtx, meter: UsageTotals): Promise<FacilitatorDecision> {
  const fac = facilitatorOf(state);
  const mock = isMockMode();
  const tier = state.config.modelTier;
  const first = ctx.phaseTurn === 0;

  // Facilitator-led phases (opening / explanation / summary / draft / closing): the chair speaks, no LLM call.
  if (isFacilitatorLed(ctx.phase, ctx.phaseTurn)) {
    return {
      nextSpeakerId: fac.id,
      facilitatorRemark: "",
      prompt: `進行役として、このフェーズの目的を果たす発言をする：${ctx.phase.goal}`,
      advancePhase: false,
      endMeeting: false,
      innerThought: "",
    };
  }

  if (ctx.phase.roundRobin) {
    const next = pickRoundRobin(state, ctx);
    let lite = mockFacilitatorLite(state, ctx.phase, next.id, first);
    if (!mock && tier !== "economy") {
      const fctx: FacilitatorCtx = { ...ctx, fixedSpeakerId: next.id };
      const r = await callStructured(
        "facilitator",
        tier,
        facilitatorSystem(state, fac),
        facilitatorUser(state, fctx),
        facilitatorLiteSchema,
        effortFor("facilitator", tier),
        meter,
      );
      if (r) lite = r;
    }
    return {
      nextSpeakerId: next.id,
      facilitatorRemark: lite.facilitatorRemark,
      prompt: lite.prompt,
      advancePhase: false,
      endMeeting: false,
      innerThought: lite.innerThought,
    };
  }

  // Free discussion.
  const ps = state.config.participants;
  const fallbackNext = leastSpoken(state, ctx, ps);
  let d: FacilitatorDecision | null = null;
  if (mock) {
    d = mockFacilitatorFree(state, ctx.phase, fallbackNext.id, first, ctx.phaseTurn, ctx.budget);
  } else {
    d = await callStructured(
      "facilitator",
      tier,
      facilitatorSystem(state, fac),
      facilitatorUser(state, ctx),
      facilitatorSchema,
      effortFor("facilitator", tier),
      meter,
    );
  }
  if (!d) {
    return {
      nextSpeakerId: fallbackNext.id,
      facilitatorRemark: "",
      prompt: `${nameOf(state, fallbackNext.id)}さん、ここまでの議論についてどうお考えですか。`,
      advancePhase: false,
      endMeeting: false,
      innerThought: "",
    };
  }
  // Sanitise: valid id, no third consecutive turn, prioritise people who have spoken little.
  let chosen = ps.find((p) => p.id === d!.nextSpeakerId);
  const allowed = eligible(state, ctx, ps);
  if (!chosen || !allowed.some((p) => p.id === chosen!.id)) chosen = fallbackNext;
  const min = Math.min(...ps.map((p) => ctx.counts[p.id] ?? 0));
  if ((ctx.counts[chosen.id] ?? 0) - min >= 3 && fallbackNext.id !== chosen.id) chosen = fallbackNext;
  const canAdvance = ctx.phaseTurn + 1 >= Math.ceil(ctx.budget / 2);
  return { ...d, nextSpeakerId: chosen.id, advancePhase: d.advancePhase && canAdvance, endMeeting: false };
}
