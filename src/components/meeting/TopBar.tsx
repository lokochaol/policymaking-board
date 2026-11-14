"use client";

import Link from "next/link";
import type { MeetingState } from "@/lib/types";
import { getMeetingType } from "@/data/meetingTypes";
import { DisclosureBadge } from "@/components/ui";
import { Icon } from "@/components/ui/icons";
import { formatUsd } from "@/components/ui/labels";

export function TopBar({ m }: { m: MeetingState }) {
  const type = getMeetingType(m.config.meetingTypeId);
  const preparing = m.status === "preparing";
  const done = m.status === "finished" || m.status === "closing";
  return (
    <header className="border-b border-line bg-white">
      <div className="mx-auto flex max-w-[1600px] flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3 sm:px-6">
        <Link href="/" className="grid h-8 w-8 place-items-center rounded-md border border-line text-ink-2 hover:border-ink-3 hover:text-ink" aria-label="ホームへ">
          <Icon name="arrow-left" size={16} />
        </Link>
        <div className="min-w-0 flex-1 basis-48">
          <h1 className="truncate text-base font-semibold text-ink">{m.config.topic}</h1>
          <p className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-ink-2">
            <span>{type.name}</span>
            <DisclosureBadge level={m.config.disclosure} />
          </p>
        </div>
        <dl className="flex items-center gap-5 text-xs text-ink-2">
          <div className="flex items-baseline gap-1.5">
            <dt>ターン</dt>
            <dd className="text-sm font-medium tabular-nums text-ink">{m.turn}</dd>
          </div>
          <div className="flex items-baseline gap-1.5" title="累計コスト（概算）">
            <dt>コスト</dt>
            <dd className="text-sm font-medium tabular-nums text-ink-2">{formatUsd(m.usage.estimatedCostUsd)}</dd>
          </div>
        </dl>
      </div>
      <ol className="scroll-thin mx-auto flex max-w-[1600px] items-center gap-1 overflow-x-auto px-4 pb-3 sm:px-6" aria-label="フェーズ">
        <StepItem n={0} label="事前調査" state={preparing ? "current" : "past"} first />
        {type.phases.map((p, i) => (
          <StepItem key={p.id} n={i + 1} label={p.name} state={preparing ? "future" : done ? "past" : i < m.phaseIndex ? "past" : i === m.phaseIndex ? "current" : "future"} />
        ))}
      </ol>
    </header>
  );
}

/** Done = ink-3 check, current = blue, upcoming = line. */
function StepItem({ n, label, state, first = false }: { n: number; label: string; state: "past" | "current" | "future"; first?: boolean }) {
  const cls =
    state === "current"
      ? "border-blue bg-blue-tint font-medium text-blue-strong"
      : state === "past"
        ? "border-transparent text-ink-3"
        : "border-line text-ink-3";
  const dot =
    state === "current" ? "bg-blue text-white" : state === "past" ? "text-ink-3" : "border border-line text-ink-3";
  return (
    <>
      {!first && <span aria-hidden className="h-px w-3 shrink-0 bg-line" />}
      <li aria-current={state === "current" ? "step" : undefined} className={`flex shrink-0 items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs ${cls}`}>
        <span className={`grid h-4 w-4 place-items-center rounded-full text-[10px] font-semibold tabular-nums ${dot}`}>
          {state === "past" ? <Icon name="check" size={12} /> : n === 0 ? <Icon name="search" size={10} /> : n}
        </span>
        <span>{label}</span>
      </li>
    </>
  );
}
