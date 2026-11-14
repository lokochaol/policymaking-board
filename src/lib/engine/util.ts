import type { MeetingState, Participant, PhaseDef, RoleTemplate, Stance, UsageTotals } from "@/lib/types";
import { getCountry } from "@/data/countries";
import { getRole, registerCustomRoles } from "@/data/roles";

export { registerCustomRoles };

/** Resolve a role (static catalog, then custom roles registered from config.customRoles). */
export function roleById(id: string): RoleTemplate | undefined {
  return getRole(id);
}

export function hashString(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function pick<T>(arr: T[], key: string): T {
  return arr[hashString(key) % arr.length];
}

export function emptyUsage(): UsageTotals {
  return { inputTokens: 0, outputTokens: 0, cacheReadTokens: 0, estimatedCostUsd: 0 };
}

export function nameOf(state: MeetingState, id: string): string {
  return state.config.participants.find((p) => p.id === id)?.name ?? id;
}

export function roleTitleOf(p: Participant): string {
  return roleById(p.roleId)?.title ?? p.roleId;
}

export function countryNameOf(p: Participant): string {
  return getCountry(p.countryCode)?.name ?? p.countryCode;
}

export function describeParticipant(p: Participant, facilitatorId?: string): string {
  return `${p.name}（${countryNameOf(p)}・${roleTitleOf(p)}）${p.id === facilitatorId ? "【進行役】" : ""}`;
}

export function facilitatorOf(state: MeetingState): Participant {
  const ps = state.config.participants;
  return ps.find((p) => p.id === state.config.facilitatorId) ?? ps[0];
}

/** Nominal budget for a phase, scaled by lengthFactor. Round-robin phases give everyone one turn. */
export function phaseBudget(phase: PhaseDef, participantCount: number, lengthFactor: number): number {
  if (phase.roundRobin) return Math.max(1, participantCount);
  return Math.max(1, Math.round(phase.turnBudget * lengthFactor));
}

/** Short non-round-robin phases open with the facilitator speaking (explanation / summary / draft / closing). */
export function isFacilitatorLed(phase: PhaseDef, phaseTurn: number): boolean {
  return !phase.roundRobin && phase.turnBudget <= 2 && phaseTurn === 0;
}

export const STANCE_LABEL: Record<Stance, string> = {
  strong_support: "強く賛成",
  support: "賛成",
  neutral: "中立",
  concern: "懸念",
  oppose: "反対",
};

export function stanceToConsent(s: Stance): 1 | 2 | 3 | 4 | 5 {
  return s === "strong_support" ? 5 : s === "support" ? 4 : s === "neutral" ? 3 : s === "concern" ? 2 : 1;
}

export function speechCounts(state: MeetingState): Record<string, number> {
  const c: Record<string, number> = {};
  for (const p of state.config.participants) c[p.id] = 0;
  for (const u of state.utterances) if (u.kind === "speech" || u.kind === "facilitation") c[u.speakerId] = (c[u.speakerId] ?? 0) + (u.kind === "speech" ? 1 : 0);
  return c;
}
