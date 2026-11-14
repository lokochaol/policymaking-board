"use client";

import { useState } from "react";
import type { DecisionRule, DisclosureLevel, MeetingType, ModelTier } from "@/lib/types";
import { DECISION_RULE_LABELS, DISCLOSURE_LABELS } from "@/data/meetingTypes";

const PER_TURN_USD: Record<ModelTier, number> = { economy: 0.004, standard: 0.025, premium: 0.045 };
const PREP_USD: Record<ModelTier, number> = { economy: 0.02, standard: 0.12, premium: 0.25 };
const CLOSE_USD: Record<ModelTier, [number, number]> = { economy: [0.05, 0.003], standard: [0.3, 0.015], premium: [0.4, 0.02] };
const JPY = 150;

export function estimateCost(tier: ModelTier, type: MeetingType, lengthFactor: number, n: number) {
  const turns = Math.round(type.phases.reduce((s, p) => s + p.turnBudget, 0) * lengthFactor);
  const [base, per] = CLOSE_USD[tier];
  const mid = turns * PER_TURN_USD[tier] + n * PREP_USD[tier] + base + n * per;
  return { turns, low: mid * 0.6, high: mid * 1.5 };
}

function Seg<T extends string | number>({
  value,
  options,
  onChange,
  label,
}: {
  value: T;
  options: { id: T; label: string; hint?: string }[];
  onChange: (v: T) => void;
  label: string;
}) {
  return (
    <div role="radiogroup" aria-label={label} className="flex flex-wrap gap-1.5">
      {options.map((o) => (
        <button
          key={String(o.id)}
          type="button"
          role="radio"
          aria-checked={o.id === value}
          onClick={() => onChange(o.id)}
          className={`rounded-full border px-3 py-1.5 text-sm transition ${
            o.id === value ? "border-navy bg-navy text-white" : "border-line bg-card text-ink-soft hover:border-gold"
          }`}
        >
          {o.label}
          {o.hint && <span className="ml-1 text-[10px] opacity-70">{o.hint}</span>}
        </button>
      ))}
    </div>
  );
}

export function AdvancedSettings({
  type,
  participantCount,
  disclosure,
  decisionRule,
  lengthFactor,
  modelTier,
  onDisclosure,
  onDecisionRule,
  onLength,
  onTier,
}: {
  type: MeetingType;
  participantCount: number;
  disclosure: DisclosureLevel;
  decisionRule: DecisionRule;
  lengthFactor: number;
  modelTier: ModelTier;
  onDisclosure: (v: DisclosureLevel) => void;
  onDecisionRule: (v: DecisionRule) => void;
  onLength: (v: number) => void;
  onTier: (v: ModelTier) => void;
}) {
  const [open, setOpen] = useState(false);
  const est = estimateCost(modelTier, type, lengthFactor, Math.max(participantCount, 2));
  return (
    <section className="rounded-2xl border border-line bg-card shadow-soft">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex w-full items-center justify-between px-4 py-3 text-left"
      >
        <span className="font-display font-bold text-ink">詳細設定</span>
        <span className="text-xs text-ink-soft">
          {DISCLOSURE_LABELS[disclosure].label}・{DECISION_RULE_LABELS[decisionRule].label} {open ? "▲" : "▼"}
        </span>
      </button>
      {open && (
        <div className="space-y-5 border-t border-line px-4 py-4">
          <div>
            <p className="mb-1.5 text-sm font-medium">開示レベル</p>
            <Seg
              label="開示レベル"
              value={disclosure}
              onChange={onDisclosure}
              options={(Object.keys(DISCLOSURE_LABELS) as DisclosureLevel[]).map((k) => ({ id: k, label: DISCLOSURE_LABELS[k].label }))}
            />
            <p className="mt-1.5 text-xs text-ink-soft">{DISCLOSURE_LABELS[disclosure].description}</p>
          </div>
          <div>
            <p className="mb-1.5 text-sm font-medium">合意ルール</p>
            <Seg
              label="合意ルール"
              value={decisionRule}
              onChange={onDecisionRule}
              options={(Object.keys(DECISION_RULE_LABELS) as DecisionRule[]).map((k) => ({ id: k, label: DECISION_RULE_LABELS[k].label }))}
            />
            <p className="mt-1.5 text-xs text-ink-soft">{DECISION_RULE_LABELS[decisionRule].description}</p>
          </div>
          <div>
            <p className="mb-1.5 text-sm font-medium">会議の長さ</p>
            <Seg
              label="会議の長さ"
              value={lengthFactor}
              onChange={onLength}
              options={[
                { id: 0.5, label: "短い" },
                { id: 1, label: "標準" },
                { id: 2, label: "長い" },
              ]}
            />
          </div>
          <div>
            <p className="mb-1.5 text-sm font-medium">モデルの品質</p>
            <Seg
              label="モデルの品質"
              value={modelTier}
              onChange={onTier}
              options={[
                { id: "economy", label: "エコノミー" },
                { id: "standard", label: "標準" },
                { id: "premium", label: "プレミアム" },
              ]}
            />
            <div className="mt-3 rounded-xl bg-gold-soft/60 px-3 py-2 text-sm">
              概算コスト：
              <strong className="font-bold text-navy">
                ${est.low.toFixed(2)}〜${est.high.toFixed(2)}
              </strong>
              <span className="text-ink-soft">（約{Math.round(est.low * JPY).toLocaleString()}〜{Math.round(est.high * JPY).toLocaleString()}円・約{est.turns}ターン）</span>
              <p className="mt-0.5 text-xs text-ink-soft">事前調査（ウェブ検索）の費用を含みます。APIキー未設定のモックモードでは無料です。</p>
            </div>
          </div>
        </div>
      )}
      {!open && (
        <p className="border-t border-line px-4 py-2 text-xs text-ink-soft">
          概算コスト ${est.low.toFixed(2)}〜${est.high.toFixed(2)}（事前調査のウェブ検索を含む）
        </p>
      )}
    </section>
  );
}
