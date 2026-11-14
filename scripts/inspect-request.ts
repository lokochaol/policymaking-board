// Run: npx tsx scripts/inspect-request.ts
// Builds the speaker / facilitator / satisfaction request params WITHOUT sending, and prints the system
// blocks with their cache_control so the caching layout can be checked by eye.
import { createParticipant } from "../src/lib/participants";
import { getMeetingType } from "../src/data/meetingTypes";
import { buildParams } from "../src/lib/engine/client";
import { createInitialClock } from "../src/lib/engine/clock";
import { speakerSystem, speakerUser, facilitatorSystem, facilitatorUser, satisfactionSystem } from "../src/lib/engine/prompts";
import { speakerSchema, facilitatorSchema, satisfactionSchema } from "../src/lib/engine/schemas";
import type { MeetingState } from "../src/lib/types";

const type = getMeetingType("council");
const ps = [["jhs_student", "JP"], ["bus_driver", "JP"], ["hs_teacher", "JP"]].map(([r, c], i) => createParticipant(r, c, `inspect-${i}`, i));
ps[1].isFacilitator = true;
const state: MeetingState = {
  config: {
    id: "inspect", createdAt: new Date().toISOString(), topic: "高校の部活動の地域移行", meetingTypeId: type.id,
    disclosure: type.disclosure, decisionRule: type.decisionRule, participants: ps, facilitatorId: ps[1].id,
    modelTier: "standard", durationMinutes: 60, customRoles: [],
  },
  status: "running", phaseIndex: 3, turn: 12, phaseTurn: 2, utterances: [],
  clock: { ...createInitialClock({ durationMinutes: 60, participants: ps }, type), elapsedMin: 28, phaseStartedAtMin: 20 },
  minutes: { summary: "（要旨）", agendaItems: [], issues: [], proposals: [], keyExchanges: [], coveredThroughTurn: 0 },
  research: {}, initialStances: {}, usage: { inputTokens: 0, outputTokens: 0, cacheReadTokens: 0, estimatedCostUsd: 0 },
};
const phase = type.phases[3];

function show(label: string, params: ReturnType<typeof buildParams>) {
  console.log(`\n===== ${label} =====`);
  console.log(`model=${params.model} max_tokens=${params.max_tokens} top-level cache_control=${"cache_control" in params ? "YES (bad)" : "none"}`);
  const sys = params.system;
  if (typeof sys === "string") console.log(`system: string (${sys.length} chars, NOT cached)`);
  else
    sys.forEach((b, i) => {
      const cc = b.cache_control ? JSON.stringify(b.cache_control) : "-";
      const head = b.text.split("\n").slice(0, 2).join(" | ").slice(0, 90);
      console.log(`system[${i}] cache_control=${cc} chars=${b.text.length}  "${head}..."`);
    });
  const u = params.messages[0].content as string;
  console.log(`user message: ${u.length} chars (unique per call, after all breakpoints)`);
}

show("speaker", buildParams("speaker", "standard", speakerSystem(state, ps[0]), speakerUser(state, ps[0], phase, "指示"), speakerSchema, "low"));
show("speaker (other person: block 0 identical => shared cache hit)", buildParams("speaker", "standard", speakerSystem(state, ps[2]), speakerUser(state, ps[2], phase, "指示"), speakerSchema, "low"));
show("facilitator", buildParams("facilitator", "standard", facilitatorSystem(state, ps[1]), facilitatorUser(state, { phase, phaseIndex: 3, cap: 40, phaseTurn: 2, counts: {}, plannedMin: 15, phaseElapsedMin: 8 }), facilitatorSchema, "low"));
show("satisfaction", buildParams("satisfaction", "standard", satisfactionSystem(state, ps[0]), "アンケート", satisfactionSchema, "low"));
const a = speakerSystem(state, ps[0]);
const b = speakerSystem(state, ps[2]);
const s = satisfactionSystem(state, ps[0]);
console.log(`\nspeaker[0] identical across people: ${a[0].text === b[0].text}; satisfaction reuses speaker blocks: ${s[0].text === a[0].text && s[1].text === a[1].text}`);
console.log("\n--- shared block 0 (speaker) ---\n" + a[0].text.slice(0, 1200));
