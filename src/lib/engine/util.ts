import type { MeetingState, Participant, PhaseDef, RoleTemplate, Stance, UsageTotals } from "@/lib/types";
import { getCountry } from "@/data/countries";
import { ROLES } from "@/data/roles";
import { MAX_PHASE_TURNS } from "./clock";

/** Resolves a role id to its template. Built per request from the static catalog + that request's custom roles. */
export type RoleResolver = (id: string) => RoleTemplate | undefined;

const STATIC_ROLES = new Map<string, RoleTemplate>(ROLES.map((r) => [r.id, r]));

export function staticRole(id: string): RoleTemplate | undefined {
  return STATIC_ROLES.get(id);
}

/** No global registry: the resolver closes over exactly the custom roles it is given. */
export function makeRoleResolver(customRoles?: RoleTemplate[]): RoleResolver {
  const custom = new Map<string, RoleTemplate>((customRoles ?? []).map((r) => [r.id, r]));
  return (id) => STATIC_ROLES.get(id) ?? custom.get(id);
}

const resolverCache = new WeakMap<object, RoleResolver>();
/** Resolver for a meeting state (cached per config object). */
export function resolverOf(state: MeetingState): RoleResolver {
  const key = state.config as object;
  let r = resolverCache.get(key);
  if (!r) {
    r = makeRoleResolver(state.config.customRoles);
    resolverCache.set(key, r);
  }
  return r;
}

export function roleOfParticipant(state: MeetingState, p: Participant): RoleTemplate | undefined {
  return resolverOf(state)(p.roleId);
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

export function roleTitleOf(p: Participant, rr: RoleResolver): string {
  return rr(p.roleId)?.title ?? p.roleId;
}

export function countryNameOf(p: Participant): string {
  return getCountry(p.countryCode)?.name ?? p.countryCode;
}

export function describeParticipant(p: Participant, rr: RoleResolver, facilitatorId?: string): string {
  return `${p.name}（${countryNameOf(p)}・${roleTitleOf(p, rr)}）${p.id === facilitatorId ? "【進行役】" : ""}`;
}

export function facilitatorOf(state: MeetingState): Participant {
  const ps = state.config.participants;
  return ps.find((p) => p.id === state.config.facilitatorId) ?? ps[0];
}

/** Hard cap on turns in a phase: round-robin = everyone once, short led phases = their budget, free phases = safety cap. */
export function phaseCap(phase: PhaseDef, participantCount: number): number {
  if (phase.roundRobin) return Math.max(1, participantCount);
  if (phase.turnBudget <= 2) return phase.turnBudget;
  return MAX_PHASE_TURNS;
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

/** Number of kind:"speech" utterances per participant. */
export function speechCounts(state: MeetingState): Record<string, number> {
  const c: Record<string, number> = {};
  for (const p of state.config.participants) c[p.id] = 0;
  for (const u of state.utterances) if (u.kind === "speech") c[u.speakerId] = (c[u.speakerId] ?? 0) + 1;
  return c;
}
