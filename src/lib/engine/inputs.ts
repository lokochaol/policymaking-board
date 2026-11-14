// Zod validation of every API input (D1). Limits are deliberately generous for honest clients and tight
// enough that a hostile body cannot trigger unbounded paid LLM work.
import { z } from "zod";
import type { MeetingState } from "@/lib/types";
import { CATEGORY_LABELS } from "@/data/roles";
import { ACCESSORIES, OUTFITS } from "./createRole";
import { stanceEnum, proposalKindEnum, proposalStatusEnum, keyExchangeKindEnum } from "./schemas";

const str = (max: number) => z.string().max(max);
const strs = (maxItem: number, maxLen: number) => z.array(str(maxLen)).max(maxItem);

export const tierEnum = z.enum(["economy", "standard", "premium"]);
export const categoryEnum = z.enum(Object.keys(CATEGORY_LABELS) as [keyof typeof CATEGORY_LABELS, ...(keyof typeof CATEGORY_LABELS)[]]);
const meetingTypeEnum = z.enum([
  "council", "study_group", "hearing", "town_meeting", "citizens_assembly",
  "roundtable", "negotiation", "nemawashi", "assembly_committee", "cabinet",
]);
const disclosureEnum = z.enum(["public", "closed", "chatham", "offrecord"]);
const decisionRuleEnum = z.enum(["chair_discretion", "both_views", "consensus", "majority", "unanimity", "vote_ranked", "no_decision"]);

export const roleTemplateSchema = z.object({
  id: str(100).min(1),
  category: categoryEnum,
  title: str(120),
  shortTitle: str(40),
  ageRange: z.tuple([z.number().min(0).max(120), z.number().min(0).max(120)]),
  outfit: z.enum(OUTFITS),
  accessory: z.enum(ACCESSORIES),
  description: str(3000),
  interests: strs(12, 400),
  concerns: strs(12, 400),
  privateConcerns: strs(12, 400),
  constraints: strs(12, 400),
  speechStyle: str(800),
  influence: z.number().min(0).max(100),
  expertise: z.number().min(0).max(100),
});
export const customRolesSchema = z.array(roleTemplateSchema).max(20);

const participantSchema = z.object({
  id: str(100).min(1),
  roleId: str(100).min(1),
  countryCode: str(8).min(1),
  name: str(100),
  age: z.number().min(0).max(120),
  personality: str(300),
  avatar: z.object({
    skinTone: z.number(),
    hairStyle: z.number(),
    hairColor: str(32),
    gender: z.enum(["male", "female"]),
    age: z.number(),
    outfit: z.enum(OUTFITS),
    outfitColor: str(32),
    accessory: z.enum(ACCESSORIES),
    glasses: z.boolean(),
  }),
  seatIndex: z.number().int().min(0).max(100),
  isFacilitator: z.boolean(),
});

const configSchema = z.object({
  id: str(100),
  createdAt: str(64),
  topic: str(500).min(1),
  background: str(3000).optional(),
  meetingTypeId: meetingTypeEnum,
  disclosure: disclosureEnum,
  decisionRule: decisionRuleEnum,
  participants: z.array(participantSchema).min(2).max(16),
  facilitatorId: str(100),
  modelTier: tierEnum,
  lengthFactor: z.union([z.literal(0.5), z.literal(1), z.literal(2)]),
  customRoles: customRolesSchema,
});

const utteranceSchema = z.object({
  id: str(60),
  turn: z.number().int(),
  phaseId: str(60),
  speakerId: str(100),
  kind: z.enum(["speech", "facilitation"]),
  text: str(1000),
  innerThought: str(2000).optional(),
  addressedTo: z.array(str(100)).max(16).optional(),
  stance: stanceEnum.optional(),
  proposalRefs: z.array(str(60)).max(32).optional(),
  timestamp: str(64),
});

const proposalSchema = z.object({
  id: str(60),
  title: str(300),
  body: str(3000),
  proposedBy: str(100),
  kind: proposalKindEnum,
  status: proposalStatusEnum,
  support: z.record(z.string(), stanceEnum),
  conditions: strs(20, 500).optional(),
  history: z.array(z.object({ turn: z.number(), note: str(300) })).max(500),
});

const keyExchangeSchema = z.object({
  id: str(80),
  title: str(300),
  kind: keyExchangeKindEnum,
  utteranceIds: z.array(str(60)).max(50),
  participantIds: z.array(str(100)).max(16),
  summary: str(2000),
  significance: str(2000),
});

const minutesSchema = z.object({
  summary: str(8000),
  agendaItems: z.array(z.object({ phaseId: str(60), title: str(300), points: strs(50, 600) })).max(40),
  issues: z
    .array(
      z.object({
        id: str(80),
        title: str(300),
        positions: z
          .array(z.object({ participantId: str(100), position: str(1000), interest: str(1000).optional(), stance: stanceEnum }))
          .max(16),
        landingZone: str(1500).optional(),
        resolved: z.boolean(),
      }),
    )
    .max(60),
  proposals: z.array(proposalSchema).max(100),
  keyExchanges: z.array(keyExchangeSchema).max(60),
  coveredThroughTurn: z.number().int(),
});

const reportSchema = z.object({
  participantId: str(100),
  score: z.number().min(0).max(100),
  consent: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4), z.literal(5)]),
  agreedPoints: strs(20, 600),
  disagreedPoints: strs(20, 600),
  remainingConcerns: strs(20, 600),
  hopes: strs(20, 600),
  comment: str(1500),
  stanceShift: z.object({ from: stanceEnum, to: stanceEnum, reason: str(1000) }),
  votes: z.record(z.string(), stanceEnum).optional(),
});

const sourceSchema = z.object({ title: str(500), url: str(2000) });
const briefSchema = z.object({
  participantId: str(100),
  status: z.enum(["pending", "researching", "done", "failed"]),
  queries: strs(30, 500),
  approach: str(2000),
  summary: str(6000),
  keyFacts: z.array(z.object({ fact: str(1000), source: sourceSchema.optional() })).max(30),
  talkingPoints: strs(20, 600),
  questionsToRaise: strs(20, 600),
  sources: z.array(sourceSchema).max(40),
});

export const stateSchema = z.object({
  config: configSchema,
  status: z.enum(["setup", "preparing", "running", "paused", "closing", "finished", "error"]),
  phaseIndex: z.number().int().min(0).max(60),
  turn: z.number().int().min(0).max(5000),
  phaseTurn: z.number().int().min(0).max(5000),
  utterances: z.array(utteranceSchema).max(2000),
  minutes: minutesSchema,
  pendingDirective: z
    .object({
      nextSpeakerId: str(100),
      facilitatorRemark: str(2000),
      prompt: str(2000),
      advancePhase: z.boolean(),
      endMeeting: z.boolean(),
      innerThought: str(2000),
    })
    .optional(),
  closingReports: z.array(reportSchema).max(16).optional(),
  research: z.record(z.string(), briefSchema),
  initialStances: z.record(z.string(), z.object({ stance: stanceEnum, summary: str(500) })),
  usage: z.object({
    inputTokens: z.number(),
    outputTokens: z.number(),
    cacheReadTokens: z.number(),
    estimatedCostUsd: z.number(),
  }),
  error: str(2000).optional(),
});

export const stateBodySchema = z.object({ state: stateSchema });
export const prepareBodySchema = z.object({ state: stateSchema, participantId: str(100) });

export const discoverBodySchema = z.object({
  topic: str(500).min(1),
  background: str(3000).optional(),
  countryCodes: z.array(str(8)).max(16).default([]),
  selectedRoleIds: z.array(str(100)).max(40).default([]),
  customRoles: customRolesSchema.default([]),
  modelTier: tierEnum.default("standard"),
});

export const createRoleBodySchema = z.object({
  title: str(120).min(1),
  category: categoryEnum,
  sketch: str(1000),
  topic: str(500),
  countryCode: str(8).optional(),
  modelTier: tierEnum.default("standard"),
});

/** The parsed state is structurally a MeetingState (outcome is dropped: the server never needs it). */
export function asState(s: z.infer<typeof stateSchema>): MeetingState {
  return s as unknown as MeetingState;
}
