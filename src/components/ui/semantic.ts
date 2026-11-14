/**
 * Single source of truth for "what colour means what" (docs/04-visual-system.md).
 * Components must not pick colours for domain values themselves; they ask for a style here.
 *
 *   teal   = support / agreement / done
 *   yellow = concern / conditional / caution / pending
 *   coral  = oppose / rejected / conflict / error / irreversible
 *   blue   = progress / interaction / info / facilitator / research
 *   ink    = structure (no meaning); neutral = ink-3 dot or subtle surface
 *
 * Disclosure levels deliberately carry no colour (it would clash with stance colours).
 */
import type { DisclosureLevel, KeyExchange, MeetingStatus, ProposalStatus, ResearchBrief, Stance } from "@/lib/types";
import { DISCLOSURE_LABELS } from "@/data/meetingTypes";
import type { IconName } from "./icons";
import { CONSENT_LABEL, KEY_EXCHANGE_LABEL, PROPOSAL_STATUS_LABEL, RESEARCH_STATUS_LABEL, STANCE_LABEL } from "./labels";

export type Tone = "neutral" | "ink" | "teal" | "yellow" | "coral" | "blue";

/** Class strings are written out in full so Tailwind can see them. */
export const BADGE_CLASS: Record<Tone, string> = {
  neutral: "border-line bg-subtle text-ink-2",
  ink: "border-ink-3 bg-white text-ink",
  teal: "border-teal/50 bg-teal-tint text-teal-strong",
  yellow: "border-yellow bg-yellow-tint text-ink",
  coral: "border-coral/40 bg-coral-tint text-coral-strong",
  blue: "border-blue/40 bg-white text-blue-strong",
};

export const TONE_TEXT: Record<Tone, string> = {
  neutral: "text-ink-2",
  ink: "text-ink",
  teal: "text-teal-strong",
  yellow: "text-yellow-strong",
  coral: "text-coral-strong",
  blue: "text-blue-strong",
};

export const TONE_SURFACE: Record<Tone, string> = {
  neutral: "bg-subtle border-line",
  ink: "bg-subtle border-line",
  teal: "bg-teal-tint border-teal/40",
  yellow: "bg-yellow-tint border-yellow",
  coral: "bg-coral-tint border-coral/40",
  blue: "bg-blue-tint border-blue/30",
};

/* ------------------------------------------------------------------ stance */

export interface StanceStyle {
  label: string;
  /** CSS colour for dots / rings / stripes. */
  color: string;
  /** Darker edge so yellow and outline dots stay visible on white. */
  edge: string;
  /** Left stripe on transcript rows. */
  stripe: string;
  /** strong_support is a filled disc, support a ring, the rest a plain disc. */
  fill: "solid" | "ring";
  tone: Tone;
}

const STANCE_STYLE: Record<Stance, StanceStyle> = {
  strong_support: { label: STANCE_LABEL.strong_support, color: "var(--color-teal)", edge: "var(--color-teal)", stripe: "var(--color-teal)", fill: "solid", tone: "teal" },
  support: { label: STANCE_LABEL.support, color: "var(--color-teal)", edge: "var(--color-teal)", stripe: "color-mix(in srgb, var(--color-teal) 55%, white)", fill: "ring", tone: "teal" },
  neutral: { label: STANCE_LABEL.neutral, color: "var(--color-ink-3)", edge: "var(--color-ink-3)", stripe: "var(--color-ink-3)", fill: "solid", tone: "neutral" },
  concern: { label: STANCE_LABEL.concern, color: "var(--color-yellow)", edge: "var(--color-yellow-strong)", stripe: "var(--color-yellow)", fill: "solid", tone: "yellow" },
  oppose: { label: STANCE_LABEL.oppose, color: "var(--color-coral)", edge: "var(--color-coral)", stripe: "var(--color-coral)", fill: "solid", tone: "coral" },
};

const STANCE_NONE: StanceStyle = { label: "未表明", color: "var(--color-line)", edge: "var(--color-ink-3)", stripe: "var(--color-line)", fill: "ring", tone: "neutral" };

export function stanceStyle(stance?: Stance): StanceStyle {
  return stance ? STANCE_STYLE[stance] : STANCE_NONE;
}

/* --------------------------------------------------------------- proposals */

export interface ProposalStatusStyle {
  label: string;
  tone: Tone;
  /** Half teal / half coral marker for "both views". */
  split?: boolean;
}

const PROPOSAL_STYLE: Record<ProposalStatus, ProposalStatusStyle> = {
  agreed: { label: PROPOSAL_STATUS_LABEL.agreed, tone: "teal" },
  conditionally_agreed: { label: PROPOSAL_STATUS_LABEL.conditionally_agreed, tone: "yellow" },
  both_views: { label: PROPOSAL_STATUS_LABEL.both_views, tone: "ink", split: true },
  deferred: { label: PROPOSAL_STATUS_LABEL.deferred, tone: "neutral" },
  rejected: { label: PROPOSAL_STATUS_LABEL.rejected, tone: "coral" },
  draft: { label: PROPOSAL_STATUS_LABEL.draft, tone: "blue" },
  discussing: { label: PROPOSAL_STATUS_LABEL.discussing, tone: "blue" },
};

export function proposalStatusStyle(status: ProposalStatus): ProposalStatusStyle {
  return PROPOSAL_STYLE[status];
}

/* ----------------------------------------------------------------- consent */

export interface ConsentStyle {
  label: string;
  /** Bar / swatch fill (full class so Tailwind can see it). */
  bar: string;
  text: string;
}

const CONSENT_STYLE: Record<number, ConsentStyle> = {
  5: { label: CONSENT_LABEL[5], bar: "bg-teal", text: "text-teal-strong" },
  4: { label: CONSENT_LABEL[4], bar: "bg-teal/60", text: "text-teal-strong" },
  3: { label: CONSENT_LABEL[3], bar: "bg-yellow", text: "text-yellow-strong" },
  2: { label: CONSENT_LABEL[2], bar: "bg-coral/60", text: "text-coral-strong" },
  1: { label: CONSENT_LABEL[1], bar: "bg-coral", text: "text-coral-strong" },
};

export function consentStyle(consent: number): ConsentStyle {
  return CONSENT_STYLE[Math.max(1, Math.min(5, Math.round(consent)))] ?? CONSENT_STYLE[3];
}

/* --------------------------------------------------------- key exchanges */

export interface ExchangeKindStyle {
  label: string;
  icon: IconName;
  tone: Tone;
}

const EXCHANGE_STYLE: Record<KeyExchange["kind"], ExchangeKindStyle> = {
  conflict: { label: KEY_EXCHANGE_LABEL.conflict, icon: "bolt", tone: "coral" },
  concession: { label: KEY_EXCHANGE_LABEL.concession, icon: "handshake", tone: "teal" },
  alliance: { label: KEY_EXCHANGE_LABEL.alliance, icon: "link", tone: "teal" },
  tradeoff: { label: KEY_EXCHANGE_LABEL.tradeoff, icon: "scale", tone: "blue" },
  reframe: { label: KEY_EXCHANGE_LABEL.reframe, icon: "refresh", tone: "blue" },
  breakthrough: { label: KEY_EXCHANGE_LABEL.breakthrough, icon: "sparkle", tone: "yellow" },
};

export function exchangeKindStyle(kind: KeyExchange["kind"]): ExchangeKindStyle {
  return EXCHANGE_STYLE[kind];
}

/* ---------------------------------------------------------------- research */

export interface ResearchStatusStyle {
  label: string;
  tone: Tone;
  icon: IconName;
  pulse?: boolean;
}

export function researchStatusStyle(status: ResearchBrief["status"] | "pending"): ResearchStatusStyle {
  switch (status) {
    case "done":
      return { label: RESEARCH_STATUS_LABEL.done, tone: "teal", icon: "check" };
    case "failed":
      return { label: RESEARCH_STATUS_LABEL.failed, tone: "coral", icon: "alert" };
    case "researching":
      return { label: RESEARCH_STATUS_LABEL.researching, tone: "blue", icon: "search", pulse: true };
    default:
      return { label: RESEARCH_STATUS_LABEL.pending, tone: "neutral", icon: "search" };
  }
}

/* -------------------------------------------------------------- disclosure */

const DISCLOSURE_ICON: Record<DisclosureLevel, IconName> = {
  public: "globe",
  closed: "door",
  chatham: "chat-bubble",
  offrecord: "lock",
};

/** Icon + label only. No colour on purpose. */
export function disclosureMeta(level: DisclosureLevel): { icon: IconName; label: string } {
  return { icon: DISCLOSURE_ICON[level], label: DISCLOSURE_LABELS[level].label };
}

/* ---------------------------------------------------------- meeting status */

/** Progress = blue, finished = teal, paused/pending = yellow, error = coral, not started = neutral. */
export function meetingStatusStyle(status: MeetingStatus): { label: string; tone: Tone } {
  switch (status) {
    case "setup":
      return { label: "準備中", tone: "neutral" };
    case "preparing":
      return { label: "事前調査", tone: "blue" };
    case "running":
      return { label: "進行中", tone: "blue" };
    case "paused":
      return { label: "一時停止", tone: "yellow" };
    case "closing":
      return { label: "閉会処理中", tone: "blue" };
    case "finished":
      return { label: "終了", tone: "teal" };
    case "error":
      return { label: "エラー", tone: "coral" };
  }
}

/* ---------------------------------------------- satisfaction detail lists */

export type PointKind = "agreed" | "disagreed" | "concern" | "hope";

/** agreed = teal, disagreed = coral, remaining concern = yellow, hope = blue (information). */
export function pointKindStyle(kind: PointKind): { label: string; icon: IconName; tone: Tone } {
  switch (kind) {
    case "agreed":
      return { label: "納得している点", icon: "check", tone: "teal" };
    case "disagreed":
      return { label: "納得していない点", icon: "x", tone: "coral" };
    case "concern":
      return { label: "残る懸念", icon: "alert", tone: "yellow" };
    case "hope":
      return { label: "希望", icon: "sparkle", tone: "blue" };
  }
}
