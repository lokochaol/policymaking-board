import type { MeetingState, Participant, PhaseDef, SpeakerOutput, UsageTotals } from "@/lib/types";
import { callStructured, isMockMode } from "./client";
import { effortFor } from "./models";
import { mockSpeaker } from "./mock";
import { speakerSystem, speakerUser } from "./prompts";
import { speakerSchema } from "./schemas";

export async function runSpeaker(
  state: MeetingState,
  p: Participant,
  phase: PhaseDef,
  directive: string,
  meter: UsageTotals,
): Promise<SpeakerOutput | null> {
  if (isMockMode()) return mockSpeaker(state, p, phase);
  const tier = state.config.modelTier;
  const r = await callStructured(
    "speaker",
    tier,
    speakerSystem(state, p),
    speakerUser(state, phase, directive),
    speakerSchema,
    effortFor("speaker", tier),
    meter,
  );
  if (!r || !r.text.trim()) return null;
  return {
    text: r.text,
    innerThought: r.innerThought,
    stance: r.stance,
    addressedTo: r.addressedTo,
    newProposal: r.newProposal ?? undefined,
    proposalStances: Object.fromEntries(r.proposalStances.map((x) => [x.id, x.stance])),
  };
}
