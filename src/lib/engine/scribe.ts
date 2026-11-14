import type { MeetingState, Minutes, PhaseDef, Proposal, UsageTotals, Utterance } from "@/lib/types";
import { callStructured, isMockMode } from "./client";
import { effortFor } from "./models";
import { mockScribe } from "./mock";
import { SCRIBE_SYSTEM, scribeUser } from "./prompts";
import { minutesSchema } from "./schemas";

/** Incrementally update the minutes. `state` must already include the new utterances. */
export async function runScribe(
  state: MeetingState,
  fresh: Utterance[],
  newTurn: number,
  phase: PhaseDef,
  meter: UsageTotals,
): Promise<Minutes> {
  const prev = state.minutes;
  if (isMockMode()) return mockScribe(state, prev, newTurn);
  const tier = state.config.modelTier;
  const r = await callStructured(
    "scribe",
    tier,
    SCRIBE_SYSTEM,
    scribeUser(state, prev, fresh, phase),
    minutesSchema,
    effortFor("scribe", tier),
    meter,
  );
  // On failure keep the minutes (and coveredThroughTurn) unchanged so the next run covers these turns again.
  if (!r) return prev;
  const ids = new Set(state.config.participants.map((p) => p.id));
  const uids = new Set(state.utterances.map((u) => u.id));
  const prevById = new Map(prev.proposals.map((p) => [p.id, p]));
  const seen = new Set<string>();
  const proposals: Proposal[] = [];
  for (const rp of r.proposals) {
    const old = prevById.get(rp.id);
    seen.add(rp.id);
    proposals.push({
      id: rp.id,
      title: rp.title || old?.title || "",
      body: rp.body || old?.body || "",
      proposedBy: old?.proposedBy ?? (ids.has(rp.proposedBy) ? rp.proposedBy : state.config.facilitatorId),
      kind: rp.kind,
      status: rp.status,
      // Stances the speakers stated themselves win over the scribe's reading.
      support: { ...Object.fromEntries(rp.support.filter((s) => ids.has(s.participantId)).map((s) => [s.participantId, s.stance])), ...(old?.support ?? {}) },
      conditions: rp.conditions.length ? rp.conditions : undefined,
      history: old?.history ?? [],
    });
  }
  for (const old of prev.proposals) if (!seen.has(old.id)) proposals.push(old); // never lose a proposal
  return {
    summary: r.summary || prev.summary,
    agendaItems: r.agendaItems,
    issues: r.issues.map((i) => ({
      id: i.id,
      title: i.title,
      positions: i.positions
        .filter((x) => ids.has(x.participantId))
        .map((x) => ({ participantId: x.participantId, position: x.position, interest: x.interest || undefined, stance: x.stance })),
      landingZone: i.landingZone || undefined,
      resolved: i.resolved,
    })),
    proposals,
    keyExchanges: r.keyExchanges.map((k) => ({
      ...k,
      utteranceIds: k.utteranceIds.filter((u) => uids.has(u)),
      participantIds: k.participantIds.filter((p) => ids.has(p)),
    })),
    coveredThroughTurn: newTurn,
  };
}
