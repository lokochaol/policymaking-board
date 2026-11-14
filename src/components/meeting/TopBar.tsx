"use client";

import Link from "next/link";
import type { MeetingState } from "@/lib/types";
import { getMeetingType } from "@/data/meetingTypes";
import { DisclosureBadge } from "@/components/ui";
import { formatUsd } from "@/components/ui/labels";

export function TopBar({ m }: { m: MeetingState }) {
  const type = getMeetingType(m.config.meetingTypeId);
  const preparing = m.status === "preparing";
  const done = m.status === "finished" || m.status === "closing";
  return (
    <header className="border-b border-line bg-card/90 backdrop-blur">
      <div className="mx-auto flex max-w-[1600px] flex-wrap items-center gap-x-4 gap-y-2 px-3 py-2.5 sm:px-5">
        <Link href="/" className="text-sm text-ink-soft hover:text-ink" aria-label="ホームへ">
          ←
        </Link>
        <div className="min-w-0 flex-1 basis-48">
          <h1 className="font-display truncate text-base font-bold text-navy sm:text-lg">{m.config.topic}</h1>
          <p className="flex flex-wrap items-center gap-2 text-xs text-ink-soft">
            <span>{type.name}</span>
            <DisclosureBadge level={m.config.disclosure} />
          </p>
        </div>
        <div className="flex items-center gap-4 text-xs text-ink-soft">
          <span>
            ターン <strong className="text-sm text-ink">{m.turn}</strong>
          </span>
          <span title="累計コスト（概算）">
            💰 <strong className="text-sm text-ink">{formatUsd(m.usage.estimatedCostUsd)}</strong>
          </span>
        </div>
      </div>
      <ol className="scroll-thin mx-auto flex max-w-[1600px] gap-1 overflow-x-auto px-3 pb-2.5 sm:px-5" aria-label="フェーズ">
        <StepItem n={0} label="事前調査" state={preparing ? "current" : "past"} />
        {type.phases.map((p, i) => (
          <StepItem key={p.id} n={i + 1} label={p.name} state={preparing ? "future" : done ? "past" : i < m.phaseIndex ? "past" : i === m.phaseIndex ? "current" : "future"} />
        ))}
      </ol>
    </header>
  );
}

function StepItem({ n, label, state }: { n: number; label: string; state: "past" | "current" | "future" }) {
  const cls =
    state === "current"
      ? "bg-navy text-white shadow-soft"
      : state === "past"
        ? "bg-gold-soft text-gold-dark"
        : "bg-paper-2 text-ink-faint";
  return (
    <li aria-current={state === "current" ? "step" : undefined} className={`flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1 text-xs ${cls}`}>
      <span className="font-bold">{state === "past" ? "✓" : n === 0 ? "🔍" : n}</span>
      <span className={state === "current" ? "font-bold" : ""}>{label}</span>
    </li>
  );
}
