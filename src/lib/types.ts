// ============================================================================
// Shared contract for the whole app. Every module imports from here.
// Changing a type here is a design change: update docs/02-design.md too.
// ============================================================================

// ---------- Stakeholder catalog ----------

export type RoleCategory =
  | "youth" // 学生・若者
  | "education" // 教育
  | "family" // 家庭・地域
  | "local_gov" // 地方行政
  | "national_gov" // 国政
  | "business" // 企業経営
  | "worker" // 働く人
  | "tech" // 技術者
  | "health" // 医療・福祉
  | "civil" // 市民社会・NPO・メディア
  | "primary" // 農林水産
  | "expert"; // 専門家・研究者

/** Outfit drives the avatar's clothing. */
export type Outfit =
  | "school_uniform_jhs"
  | "school_uniform_hs"
  | "casual"
  | "suit"
  | "suit_formal" // minister/PM: darker suit + pin
  | "office_casual"
  | "uniform_driver"
  | "work_jacket" // engineer/factory
  | "lab_coat"
  | "scrubs"
  | "apron"
  | "farm"
  | "hoodie" // software engineer
  | "cardigan" // teacher
  | "uniform_police";

export type Accessory =
  | "none"
  | "glasses"
  | "badge" // diet member / official badge
  | "sash" // mayor / ceremonial
  | "cap"
  | "helmet"
  | "headset"
  | "stethoscope"
  | "laptop"
  | "clipboard"
  | "name_lanyard";

export interface RoleTemplate {
  id: string; // e.g. "bus_driver"
  category: RoleCategory;
  title: string; // 日本語の肩書き e.g. "路線バスの運転手"
  shortTitle: string; // 机の名札用（8文字程度）
  ageRange: [number, number];
  outfit: Outfit;
  accessory: Accessory;
  /** One paragraph: daily life, responsibilities, who they answer to. */
  description: string;
  /** What this person wants (interests, not positions). */
  interests: string[];
  /** What they fear / pressure they are under. */
  concerns: string[];
  /** Things they would say only off the record (hidden agenda seeds). */
  privateConcerns: string[];
  /** Constraints: who they answer to, what they cannot promise in public. */
  constraints: string[];
  /** How they talk: vocabulary, tone, length. */
  speechStyle: string;
  /** 0-100. Formal power/influence in policy processes. */
  influence: number;
  /** 0-100. Expertise in policy/technical discourse (affects vocabulary). */
  expertise: number;
}

export interface Country {
  code: string; // ISO alpha-2 e.g. "JP"
  name: string; // 日本語 e.g. "日本"
  flag: string; // emoji
  /** Short political/social context that colours every role from this country. */
  context: string;
  /** Given names / family names pools for generating individuals. */
  givenNames: { male: string[]; female: string[] };
  familyNames: string[];
  /** Skin tone palette indexes typical for avatar generation (0-5). */
  skinTones: number[];
  /** Speaking language note: everyone speaks Japanese in-app, but flavour. */
  speechNote: string;
}

// ---------- Participants (a role instantiated as an individual) ----------

export interface AvatarSpec {
  skinTone: number; // 0-5
  hairStyle: number; // 0-7
  hairColor: string; // hex
  gender: "male" | "female";
  age: number;
  outfit: Outfit;
  outfitColor: string; // hex
  accessory: Accessory;
  glasses: boolean;
}

export interface Participant {
  id: string; // uuid
  roleId: string;
  countryCode: string;
  name: string; // generated personal name
  age: number;
  /** Generated personality flavour, 1 sentence. e.g. "慎重で数字に強い" */
  personality: string;
  avatar: AvatarSpec;
  seatIndex: number;
  isFacilitator: boolean;
}

// ---------- Meeting configuration ----------

export type DisclosureLevel = "public" | "closed" | "chatham" | "offrecord";

export type MeetingTypeId =
  | "council"
  | "study_group"
  | "hearing"
  | "town_meeting"
  | "citizens_assembly"
  | "roundtable"
  | "negotiation"
  | "nemawashi"
  | "assembly_committee"
  | "cabinet";

export type DecisionRule =
  | "chair_discretion"
  | "both_views"
  | "consensus"
  | "majority"
  | "unanimity"
  | "vote_ranked"
  | "no_decision";

export type RoomTheme = "council_chamber" | "roundtable_hall" | "townhall" | "backroom" | "cabinet_room";

export interface PhaseDef {
  id: string; // e.g. "opening"
  name: string; // 日本語
  /** What the facilitator should achieve in this phase. */
  goal: string;
  /** Rough number of speaking turns budgeted for this phase. */
  turnBudget: number;
  /** Whether speakers go in round-robin order in this phase. */
  roundRobin: boolean;
}

export interface MeetingType {
  id: MeetingTypeId;
  name: string;
  description: string; // for the selection card
  disclosure: DisclosureLevel;
  decisionRule: DecisionRule;
  roomTheme: RoomTheme;
  phases: PhaseDef[];
  /** Typical output document title, e.g. "答申（案）" */
  outputTitle: string;
  minParticipants: number;
  maxParticipants: number;
}

export type ModelTier = "economy" | "standard" | "premium";

export interface MeetingConfig {
  id: string;
  createdAt: string; // ISO
  topic: string; // 議題
  background?: string; // optional context the user gives
  meetingTypeId: MeetingTypeId;
  /** User may override the type's default disclosure. */
  disclosure: DisclosureLevel;
  decisionRule: DecisionRule;
  participants: Participant[];
  facilitatorId: string;
  modelTier: ModelTier;
  /** Multiplier on phase turn budgets: 0.5 short, 1 normal, 2 long. */
  lengthFactor: number;
}

// ---------- Live meeting state ----------

export type Stance = "strong_support" | "support" | "neutral" | "concern" | "oppose";

export interface Utterance {
  id: string;
  turn: number;
  phaseId: string;
  speakerId: string; // participant id
  /** "speech" = normal; "facilitation" = facilitator acting as chair; "aside" = whisper visible only in offrecord */
  kind: "speech" | "facilitation";
  text: string; // what is said aloud
  /** Private thought, never seen by other agents. Shown to the user as "本音". */
  innerThought?: string;
  addressedTo?: string[]; // participant ids
  stance?: Stance; // stance on the current main proposal / issue
  /** Ids of proposals this utterance introduces or modifies. */
  proposalRefs?: string[];
  timestamp: string;
}

export type ProposalStatus =
  | "draft" // just floated
  | "discussing"
  | "agreed"
  | "conditionally_agreed"
  | "both_views" // 両論併記
  | "rejected"
  | "deferred"; // 継続審議 / 持ち帰り

export interface Proposal {
  id: string;
  title: string;
  body: string;
  proposedBy: string; // participant id
  kind: "decision" | "recommendation" | "policy" | "action_item" | "condition";
  status: ProposalStatus;
  /** participant id -> stance */
  support: Record<string, Stance>;
  conditions?: string[]; // 条件付き合意の条件
  history: { turn: number; note: string }[];
}

/** An issue (論点) and where each participant stands on it. */
export interface Issue {
  id: string;
  title: string;
  positions: { participantId: string; position: string; interest?: string; stance: Stance }[];
  /** Emerging landing zone (落とし所) for this issue, if any. */
  landingZone?: string;
  resolved: boolean;
}

/** A crucial exchange worth highlighting (turning points, trade-offs, conflicts). */
export interface KeyExchange {
  id: string;
  title: string;
  kind: "conflict" | "tradeoff" | "breakthrough" | "concession" | "alliance" | "reframe";
  utteranceIds: string[];
  participantIds: string[];
  summary: string;
  significance: string;
}

/** Running minutes kept by the scribe. */
export interface Minutes {
  summary: string; // 議事要旨 (rolling)
  agendaItems: { phaseId: string; title: string; points: string[] }[];
  issues: Issue[];
  proposals: Proposal[];
  keyExchanges: KeyExchange[];
  /** Turn number up to which the minutes are up to date. */
  coveredThroughTurn: number;
}

export type MeetingStatus = "setup" | "preparing" | "running" | "paused" | "closing" | "finished" | "error";

export interface MeetingState {
  config: MeetingConfig;
  status: MeetingStatus;
  phaseIndex: number;
  turn: number;
  /** Turns spent in the current phase. */
  phaseTurn: number;
  utterances: Utterance[];
  minutes: Minutes;
  /** Directive from the facilitator for the next speaker. */
  pendingDirective?: FacilitatorDecision;
  outcome?: MeetingOutcome;
  /** Pre-meeting research per participant id (filled during status "preparing"). */
  research: Record<string, ResearchBrief>;
  /** Initial stance per participant (for before/after comparison). */
  initialStances: Record<string, { stance: Stance; summary: string }>;
  usage: UsageTotals;
  error?: string;
}

export interface UsageTotals {
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens: number;
  estimatedCostUsd: number;
}

// ---------- Pre-meeting research ----------

export interface ResearchSource {
  title: string;
  url: string;
}

/**
 * Each participant researches the topic *in their own way* before the meeting
 * (web search; method is never prescribed). This brief is their private notes.
 */
export interface ResearchBrief {
  participantId: string;
  status: "pending" | "researching" | "done" | "failed";
  /** Search queries the participant actually ran (shown live in the UI). */
  queries: string[];
  /** How they went about it, in their own words (e.g. "SNSで同級生の声を見た"). */
  approach: string;
  /** Their notes, in their own voice. */
  summary: string;
  keyFacts: { fact: string; source?: ResearchSource }[];
  /** Arguments / evidence they plan to bring to the table. */
  talkingPoints: string[];
  /** Questions they want to ask others. */
  questionsToRaise: string[];
  sources: ResearchSource[];
}

// ---------- Engine I/O ----------

export interface FacilitatorDecision {
  /** Who speaks next (participant id). May be the facilitator themselves. */
  nextSpeakerId: string;
  /** What the facilitator says aloud before handing over (may be empty). */
  facilitatorRemark: string;
  /** Instruction to the next speaker (e.g. "Aさんの案への懸念を具体的に"). */
  prompt: string;
  /** Move to the next phase after this turn? */
  advancePhase: boolean;
  /** End the meeting (go to closing). */
  endMeeting: boolean;
  /** Facilitator's private reasoning (shown as 本音). */
  innerThought: string;
}

export interface SpeakerOutput {
  text: string;
  innerThought: string;
  stance: Stance;
  addressedTo: string[]; // participant ids
  /** New proposal this speaker floats (optional). */
  newProposal?: { title: string; body: string; kind: Proposal["kind"] };
  /** Reaction to existing proposals: id -> stance */
  proposalStances: Record<string, Stance>;
}

export interface SatisfactionReport {
  participantId: string;
  score: number; // 0-100 納得度
  /** 5-finger consent: 5 全面賛成, 4 賛成, 3 受け入れ可能, 2 懸念あり, 1 拒否 */
  consent: 1 | 2 | 3 | 4 | 5;
  agreedPoints: string[]; // 納得している点
  disagreedPoints: string[]; // 納得していない点
  remainingConcerns: string[]; // 残る不満・懸念
  hopes: string[]; // 希望
  /** Honest one-liner in their own voice. */
  comment: string;
  /** How their stance moved compared with the start. */
  stanceShift: { from: Stance; to: Stance; reason: string };
}

export interface MeetingOutcome {
  title: string; // e.g. "答申（案）"
  executiveSummary: string;
  decisions: Proposal[]; // final status set
  landingZone: string; // 全体としての落とし所
  /** Per-stakeholder core claim: 言い分 */
  stakeholderClaims: { participantId: string; claim: string; coreInterest: string }[];
  keyExchanges: KeyExchange[];
  satisfaction: SatisfactionReport[];
  unresolvedIssues: string[];
  nextSteps: string[];
  /** Final formal minutes in Markdown. */
  minutesMarkdown: string;
}
