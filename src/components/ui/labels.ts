import type { KeyExchange, Proposal, ProposalStatus, Stance } from "@/lib/types";

export const STANCES: Stance[] = ["oppose", "concern", "neutral", "support", "strong_support"];

export const STANCE_LABEL: Record<Stance, string> = {
  strong_support: "強く賛成",
  support: "賛成",
  neutral: "中立",
  concern: "懸念",
  oppose: "反対",
};

/** 0 (oppose) .. 1 (strong support) */
export const STANCE_POS: Record<Stance, number> = {
  oppose: 0,
  concern: 0.25,
  neutral: 0.5,
  support: 0.75,
  strong_support: 1,
};

export const CONSENT_LABEL: Record<number, string> = {
  5: "全面賛成",
  4: "賛成",
  3: "受け入れ可能",
  2: "懸念あり",
  1: "拒否",
};

export const PROPOSAL_STATUS_LABEL: Record<ProposalStatus, string> = {
  draft: "提案中",
  discussing: "検討中",
  agreed: "合意",
  conditionally_agreed: "条件付き合意",
  both_views: "両論併記",
  rejected: "否決",
  deferred: "継続審議",
};

export const PROPOSAL_KIND_LABEL: Record<Proposal["kind"], string> = {
  decision: "決定事項",
  recommendation: "提言",
  policy: "政策案",
  action_item: "アクション",
  condition: "条件",
};

export const KEY_EXCHANGE_LABEL: Record<KeyExchange["kind"], string> = {
  conflict: "対立",
  tradeoff: "取引",
  breakthrough: "突破",
  concession: "譲歩",
  alliance: "連携",
  reframe: "言い換え",
};

export const RESEARCH_STATUS_LABEL = {
  pending: "待機中",
  researching: "調査中…",
  done: "調査済み",
  failed: "調査できず",
} as const;

export function formatUsd(v: number): string {
  return `$${v.toFixed(v < 1 ? 3 : 2)}`;
}

export function formatDate(iso: string): string {
  try {
    const d = new Date(iso);
    return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日 ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  } catch {
    return iso;
  }
}
