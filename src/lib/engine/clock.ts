// In-meeting clock (docs/02-design.md §10). Pure helpers: safe to import from both server and client.
import type { MeetingClock, MeetingConfig, MeetingState, MeetingType, PhaseDef, Utterance } from "@/lib/types";

export const DURATION_OPTIONS = [15, 30, 60, 90, 120] as const;
export const DEFAULT_DURATION = 60;
/** Extension allowed past the scheduled end before the meeting is forced to close. */
export const OVERRUN_LIMIT_MIN = 10;
/** Safety cap on the number of turns in one free phase. */
export const MAX_PHASE_TURNS = 40;

export type TimeStatus = "余裕あり" | "予定どおり" | "押している" | "超過";

const r2 = (n: number) => Math.round(n * 100) / 100;
const round05 = (n: number) => Math.round(n * 2) / 2;

/** Speaking time of one utterance in in-meeting minutes. */
export function utteranceMinutes(text: string): number {
  return r2(Math.max(0.3, text.length / 300) + 0.2);
}

export function reserveFor(participantCount: number): number {
  return Math.max(5, Math.round((participantCount * 0.8 + 2) * 2) / 2);
}

/** Index of the first phase of the "tail" (final confirmation round, wrap-up and closing). */
export function tailStartIndex(phases: PhaseDef[]): number {
  const last = phases.length - 1;
  let lastRR = -1;
  phases.forEach((p, i) => {
    if (p.roundRobin) lastRR = i;
  });
  if (lastRR >= phases.length - 3 && lastRR >= 0) return lastRR;
  return Math.max(0, last - 1);
}

/** Facilitator-led short phases (explanation / summary / closing). Mirrors engine/util isFacilitatorLed. */
export function isLedPhase(phase: PhaseDef): boolean {
  return !phase.roundRobin && phase.turnBudget <= 2;
}

export function createInitialClock(config: Pick<MeetingConfig, "durationMinutes" | "participants">, meetingType: Pick<MeetingType, "phases">): MeetingClock {
  const phases = meetingType.phases;
  const n = Math.max(1, config.participants.length);
  const duration = config.durationMinutes || DEFAULT_DURATION;
  const reserve = Math.min(reserveFor(n), Math.max(3, duration / 2));
  const tail = tailStartIndex(phases);
  const weight = (p: PhaseDef) => (p.roundRobin ? n * 1.2 : isLedPhase(p) ? 1.5 : p.turnBudget * 1.1);
  const head = phases.slice(0, tail);
  const headTotal = head.reduce((a, p) => a + weight(p), 0) || 1;
  const headMin = Math.max(1, duration - reserve);
  const tailPhases = phases.slice(tail);
  const tailTotal = tailPhases.reduce((a, p) => a + (p.roundRobin ? n : isLedPhase(p) ? 1.5 : p.turnBudget), 0) || 1;
  const plan = phases.map((p, i) => {
    const raw =
      i < tail ? (weight(p) / headTotal) * headMin : ((p.roundRobin ? n : isLedPhase(p) ? 1.5 : p.turnBudget) / tailTotal) * reserve;
    return { phaseId: p.id, plannedMin: Math.max(1, round05(raw)) };
  });
  return { elapsedMin: 0, plan, phaseStartedAtMin: 0, reserveMin: reserve };
}

/** Fill in clock / durations for meetings saved before the clock existed (treated as 60 minutes). */
export function normalizeMeeting(state: MeetingState): MeetingState {
  const config = state.config.durationMinutes ? state.config : { ...state.config, durationMinutes: DEFAULT_DURATION };
  let t = 0;
  let changed = config !== state.config;
  const utterances: Utterance[] = state.utterances.map((u) => {
    if (typeof u.atMinute === "number" && typeof u.durationMin === "number") {
      t = u.atMinute + u.durationMin;
      return u;
    }
    changed = true;
    const durationMin = utteranceMinutes(u.text);
    const out = { ...u, atMinute: r2(t), durationMin };
    t = r2(t + durationMin);
    return out;
  });
  const hasClock = !!state.clock && Array.isArray(state.clock.plan) && state.clock.plan.length > 0;
  if (hasClock && !changed) return state;
  return { ...state, config, utterances, clock: hasClock ? state.clock : (undefined as unknown as MeetingClock) };
}

/** Same as normalizeMeeting but also builds a missing clock (needs the meeting type's phases). */
export function withClock(state: MeetingState, meetingType: Pick<MeetingType, "phases">): MeetingState {
  const s = normalizeMeeting(state);
  if (s.clock && s.clock.plan?.length) return s;
  const base = createInitialClock(s.config, meetingType);
  const elapsed = s.utterances.length ? r2(s.utterances[s.utterances.length - 1].atMinute + s.utterances[s.utterances.length - 1].durationMin) : 0;
  const idx = Math.min(s.phaseIndex, meetingType.phases.length - 1);
  const startOfPhase = (() => {
    const id = meetingType.phases[idx]?.id;
    const first = s.utterances.find((u) => u.phaseId === id);
    return first ? first.atMinute : elapsed;
  })();
  return { ...s, clock: { ...base, elapsedMin: elapsed, phaseStartedAtMin: startOfPhase } };
}

/** Planned start / end of a phase on the plan timeline (cumulative). */
export function planWindow(clock: MeetingClock, phaseIndex: number): { start: number; end: number } {
  let start = 0;
  for (let i = 0; i < phaseIndex && i < clock.plan.length; i++) start += clock.plan[i].plannedMin;
  const end = start + (clock.plan[phaseIndex]?.plannedMin ?? 0);
  return { start, end };
}

export function timeStatus(clock: MeetingClock, durationMinutes: number, phaseIndex: number): TimeStatus {
  if (clock.elapsedMin > durationMinutes) return "超過";
  const { start, end } = planWindow(clock, phaseIndex);
  const tol = Math.max(1, durationMinutes * 0.05);
  if (durationMinutes - clock.elapsedMin <= clock.reserveMin && !clock.timeUp && clock.elapsedMin > end) return "押している";
  if (clock.elapsedMin > end + tol) return "押している";
  if (clock.elapsedMin < start - tol) return "余裕あり";
  return "予定どおり";
}

/** mm:ss since opening, e.g. 12.5 -> "12:30". */
export function formatClock(min: number): string {
  const total = Math.max(0, Math.round(min * 60));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export function fmtMin(min: number): string {
  const r = Math.round(min * 10) / 10;
  return Number.isInteger(r) ? String(r) : r.toFixed(1);
}

/** Rough number of utterances a meeting of this length produces (for the cost estimate). */
export function estimateTurns(durationMinutes: number, participantCount: number): number {
  const reserve = reserveFor(participantCount);
  return Math.max(participantCount, Math.round((durationMinutes - reserve) / 0.9 + participantCount));
}

/** "本日は60分。開会・趣旨説明に2分、意見表明に13分…" (used by the opening remark). */
export function planSummaryText(durationMinutes: number, clock: MeetingClock, phases: PhaseDef[]): string {
  const parts = clock.plan
    .map((p, i) => ({ name: phases[i]?.name ?? p.phaseId, m: p.plannedMin, id: p.phaseId }))
    .filter((p) => p.id !== phases[0]?.id && p.id !== phases[phases.length - 1]?.id)
    .map((p) => `${p.name}に${fmtMin(p.m)}分`);
  return `本日は${durationMinutes}分です。${parts.join("、")}を目安に進めます。`;
}
