import type {
  FacilitatorDecision,
  MeetingState,
  Minutes,
  MeetingStatus,
  Participant,
  Proposal,
  Stance,
  UsageTotals,
  Utterance,
} from "@/lib/types";
import { getMeetingType } from "@/data/meetingTypes";
import { callStructured, isMockMode } from "./client";
import { decideNext } from "./facilitator";
import { effortFor } from "./models";
import { mockStances } from "./mock";
import { STANCES_SYSTEM, stancesUser } from "./prompts";
import { runScribe } from "./scribe";
import { stancesSchema } from "./schemas";
import { runSpeaker } from "./speaker";
import { facilitatorOf, isFacilitatorLed, phaseBudget, speechCounts } from "./util";

export interface StepResult {
  utterances: Utterance[];
  /** Present when the scribe ran or proposals changed. */
  minutes?: Minutes;
  phaseIndex: number;
  phaseTurn: number;
  turn: number;
  status: MeetingStatus;
  /** First turn only. */
  initialStances?: MeetingState["initialStances"];
  /** The directive for the next step is always recomputed; a client-supplied pendingDirective is consumed. */
  pendingDirective: undefined;
  usage: UsageTotals;
}

async function genInitialStances(state: MeetingState, meter: UsageTotals): Promise<MeetingState["initialStances"]> {
  const fallback = mockStances(state);
  if (isMockMode()) return fallback;
  const tier = state.config.modelTier;
  const r = await callStructured("stances", tier, STANCES_SYSTEM, stancesUser(state), stancesSchema, effortFor("stances", tier), meter);
  if (!r) return fallback;
  const out = { ...fallback };
  for (const s of r.stances) if (out[s.participantId]) out[s.participantId] = { stance: s.stance, summary: s.summary };
  return out;
}

export async function runStep(input: MeetingState): Promise<StepResult> {
  const meter: UsageTotals = { ...input.usage };
  const type = getMeetingType(input.config.meetingTypeId);
  const phases = type.phases;
  const done = (extra: Partial<StepResult> = {}): StepResult => ({
    utterances: [],
    phaseIndex: input.phaseIndex,
    phaseTurn: input.phaseTurn,
    turn: input.turn,
    status: input.status,
    pendingDirective: undefined,
    usage: meter,
    ...extra,
  });
  if (input.status === "closing" || input.status === "finished") return done();
  if (input.phaseIndex >= phases.length) return done({ status: "closing" });

  let state = input;
  let initialStances: StepResult["initialStances"];
  if (!state.initialStances || Object.keys(state.initialStances).length === 0) {
    initialStances = await genInitialStances(state, meter);
    state = { ...state, initialStances };
  }

  const ps = state.config.participants;
  const phase = phases[state.phaseIndex];
  const budget = phaseBudget(phase, ps.length, state.config.lengthFactor);
  const counts = speechCounts(state);
  const turn = state.turn + 1;
  const fac = facilitatorOf(state);

  // 1. Facilitator decision (a client-supplied pendingDirective, e.g. "wrap up now", takes precedence).
  let decision: FacilitatorDecision;
  const pd = state.pendingDirective;
  if (pd && ps.some((p) => p.id === pd.nextSpeakerId)) decision = pd;
  else decision = await decideNext(state, { phase, phaseIndex: state.phaseIndex, budget, phaseTurn: state.phaseTurn, counts }, meter);

  const speaker: Participant = ps.find((p) => p.id === decision.nextSpeakerId) ?? fac;
  const ledByChair = isFacilitatorLed(phase, state.phaseTurn) && speaker.id === fac.id;
  const now = () => new Date().toISOString();
  const out: Utterance[] = [];

  // 2. Facilitator remark.
  if (decision.facilitatorRemark.trim() && !ledByChair) {
    out.push({
      id: `u${turn}_f`,
      turn,
      phaseId: phase.id,
      speakerId: fac.id,
      kind: "facilitation",
      text: decision.facilitatorRemark.trim().slice(0, 900),
      innerThought: decision.innerThought ? decision.innerThought.slice(0, 1900) : undefined,
      addressedTo: [speaker.id],
      timestamp: now(),
    });
  }

  // 3. Speaker.
  const interim: MeetingState = { ...state, utterances: [...state.utterances, ...out] };
  const sp = await runSpeaker(interim, speaker, phase, decision.prompt, meter, { ledByChair });
  const ids = new Set(ps.map((p) => p.id));
  const minutes: Minutes = { ...state.minutes, proposals: state.minutes.proposals.map((p) => ({ ...p, support: { ...p.support } })) };
  let proposalsChanged = false;
  const refs: string[] = [];
  let stance: Stance = "neutral";
  let text = "（発言を控えた）";
  let innerThought: string | undefined;
  let addressedTo: string[] = [];
  if (sp) {
    text = sp.text.trim();
    innerThought = sp.innerThought.slice(0, 1900);
    stance = sp.stance;
    addressedTo = sp.addressedTo.filter((id) => ids.has(id) && id !== speaker.id);
    if (sp.newProposal) {
      let n = minutes.proposals.length + 1;
      while (minutes.proposals.some((p) => p.id === `p${n}`)) n++;
      const np: Proposal = {
        id: `p${n}`,
        title: sp.newProposal.title,
        body: sp.newProposal.body,
        proposedBy: speaker.id,
        kind: sp.newProposal.kind,
        status: "draft",
        support: { [speaker.id]: "support" },
        history: [{ turn, note: `${speaker.name}が提案` }],
      };
      minutes.proposals.push(np);
      refs.push(np.id);
      proposalsChanged = true;
    }
    for (const [pid, s] of Object.entries(sp.proposalStances)) {
      const pr = minutes.proposals.find((x) => x.id === pid);
      if (!pr) continue;
      if (pr.support[speaker.id] !== s) {
        pr.support[speaker.id] = s;
        pr.history = [...pr.history, { turn, note: `${speaker.name}：${s}` }];
        if (pr.status === "draft") pr.status = "discussing";
        refs.push(pid);
        proposalsChanged = true;
      }
    }
  }
  const main: Utterance = {
    id: `u${turn}`,
    turn,
    phaseId: phase.id,
    speakerId: speaker.id,
    kind: ledByChair ? "facilitation" : "speech",
    text,
    innerThought,
    addressedTo: addressedTo.length ? addressedTo : undefined,
    stance,
    proposalRefs: refs.length ? [...new Set(refs)] : undefined,
    timestamp: now(),
  };
  out.push(main);

  // 4. Progress.
  const newPhaseTurn = state.phaseTurn + 1;
  const advance = decision.advancePhase || decision.endMeeting || newPhaseTurn >= budget;
  let phaseIndex = state.phaseIndex;
  let phaseTurn = newPhaseTurn;
  let status: MeetingStatus = state.status === "paused" ? "running" : state.status === "preparing" ? "running" : state.status;
  if (advance) {
    phaseIndex++;
    phaseTurn = 0;
    if (phaseIndex >= phases.length || decision.endMeeting) status = "closing";
  }

  // 5. Scribe: every 3 turns, on phase change, and at the end.
  let resultMinutes: Minutes | undefined = proposalsChanged ? minutes : undefined;
  if (turn % 3 === 0 || advance) {
    const fresh = [...state.utterances, ...out].filter((u) => u.turn > state.minutes.coveredThroughTurn);
    const withNew: MeetingState = { ...state, minutes, utterances: [...state.utterances, ...out], turn };
    resultMinutes = await runScribe(withNew, fresh, turn, phase, meter);
  }

  return {
    utterances: out,
    minutes: resultMinutes,
    phaseIndex,
    phaseTurn,
    turn,
    status,
    initialStances,
    pendingDirective: undefined,
    usage: meter,
  };
}
