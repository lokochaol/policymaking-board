import { z } from "zod";

export const stanceEnum = z.enum(["strong_support", "support", "neutral", "concern", "oppose"]);
export const proposalKindEnum = z.enum(["decision", "recommendation", "policy", "action_item", "condition"]);
export const proposalStatusEnum = z.enum([
  "draft",
  "discussing",
  "agreed",
  "conditionally_agreed",
  "both_views",
  "rejected",
  "deferred",
]);
export const keyExchangeKindEnum = z.enum(["conflict", "tradeoff", "breakthrough", "concession", "alliance", "reframe"]);

const stanceEntry = z.object({ id: z.string(), stance: stanceEnum });

export const speakerSchema = z.object({
  text: z.string(),
  innerThought: z.string(),
  stance: stanceEnum,
  addressedTo: z.array(z.string()),
  newProposal: z.object({ title: z.string(), body: z.string(), kind: proposalKindEnum }).nullable(),
  proposalStances: z.array(stanceEntry),
});
export type SpeakerRaw = z.infer<typeof speakerSchema>;

export const facilitatorSchema = z.object({
  nextSpeakerId: z.string(),
  facilitatorRemark: z.string(),
  prompt: z.string(),
  advancePhase: z.boolean(),
  endMeeting: z.boolean(),
  innerThought: z.string(),
});

/** Round-robin phases: the code picks the speaker; the model only writes remark + prompt. */
export const facilitatorLiteSchema = z.object({
  facilitatorRemark: z.string(),
  prompt: z.string(),
  innerThought: z.string(),
});

export const stancesSchema = z.object({
  stances: z.array(z.object({ participantId: z.string(), stance: stanceEnum, summary: z.string() })),
});

const proposalSchema = z.object({
  id: z.string(),
  title: z.string(),
  body: z.string(),
  proposedBy: z.string(),
  kind: proposalKindEnum,
  status: proposalStatusEnum,
  support: z.array(z.object({ participantId: z.string(), stance: stanceEnum })),
  conditions: z.array(z.string()),
  // `history` is deliberately absent: the code keeps it (saves scribe/closing output tokens).
});
export type ProposalRaw = z.infer<typeof proposalSchema>;

const keyExchangeSchema = z.object({
  id: z.string(),
  title: z.string(),
  kind: keyExchangeKindEnum,
  utteranceIds: z.array(z.string()),
  participantIds: z.array(z.string()),
  summary: z.string(),
  significance: z.string(),
});

export const minutesSchema = z.object({
  summary: z.string(),
  agendaItems: z.array(z.object({ phaseId: z.string(), title: z.string(), points: z.array(z.string()) })),
  issues: z.array(
    z.object({
      id: z.string(),
      title: z.string(),
      positions: z.array(
        z.object({ participantId: z.string(), position: z.string(), interest: z.string(), stance: stanceEnum }),
      ),
      landingZone: z.string(),
      resolved: z.boolean(),
    }),
  ),
  proposals: z.array(proposalSchema),
  keyExchanges: z.array(keyExchangeSchema),
});
export type MinutesRaw = z.infer<typeof minutesSchema>;

export const satisfactionSchema = z.object({
  score: z.number(),
  consent: z.number(),
  agreedPoints: z.array(z.string()),
  disagreedPoints: z.array(z.string()),
  remainingConcerns: z.array(z.string()),
  hopes: z.array(z.string()),
  comment: z.string(),
  stanceShift: z.object({ from: stanceEnum, to: stanceEnum, reason: z.string() }),
  /** Final stance on every proposal (the tally uses these). */
  votes: z.array(z.object({ proposalId: z.string(), stance: stanceEnum })),
});
export type SatisfactionRaw = z.infer<typeof satisfactionSchema>;

export const closingSchema = z.object({
  title: z.string(),
  executiveSummary: z.string(),
  decisions: z.array(proposalSchema),
  landingZone: z.string(),
  stakeholderClaims: z.array(z.object({ participantId: z.string(), claim: z.string(), coreInterest: z.string() })),
  keyExchanges: z.array(keyExchangeSchema),
  unresolvedIssues: z.array(z.string()),
  nextSteps: z.array(z.string()),
  minutesMarkdown: z.string(),
});
export type ClosingRaw = z.infer<typeof closingSchema>;

export const researchFormatSchema = z.object({
  approach: z.string(),
  summary: z.string(),
  keyFacts: z.array(z.object({ fact: z.string(), sourceUrl: z.string() })),
  talkingPoints: z.array(z.string()),
  questionsToRaise: z.array(z.string()),
});
export type ResearchFormatRaw = z.infer<typeof researchFormatSchema>;
