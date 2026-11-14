"use client";

import Link from "next/link";
import type { MeetingState } from "@/lib/types";
import { getMeetingType } from "@/data/meetingTypes";
import { DisclosureBadge } from "@/components/ui";
import { Icon } from "@/components/ui/icons";
import { formatUsd } from "@/components/ui/labels";
import { fmtMin, timeStatus, type TimeStatus } from "@/lib/engine/clock";

export function TopBar({ m, shownElapsed }: { m: MeetingState; shownElapsed?: number }) {
  const type = getMeetingType(m.config.meetingTypeId);
  const preparing = m.status === "preparing";
  const done = m.status === "finished" || m.status === "closing";
  const session = m.config.carryOver?.sessionNumber;
  // The clock follows what the audience has seen (the typewriter lags behind the engine).
  const clock = { ...m.clock, elapsedMin: Math.min(m.clock.elapsedMin, shownElapsed ?? m.clock.elapsedMin) };
  const status = timeStatus(clock, m.config.durationMinutes, Math.min(m.phaseIndex, type.phases.length - 1));
  return (
    <header className="border-b border-line bg-white">
      <div className="mx-auto flex max-w-[1600px] flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3 sm:px-6">
        <Link href="/" className="grid h-8 w-8 place-items-center rounded-md border border-line text-ink-2 hover:border-ink-3 hover:text-ink" aria-label="ホームへ">
          <Icon name="arrow-left" size={16} />
        </Link>
        <div className="min-w-0 flex-1 basis-48">
          <h1 className="truncate text-base font-semibold text-ink">{m.config.topic}</h1>
          <p className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-ink-2">
            {session && <span className="font-medium text-ink">第{session}回</span>}
            <span>{type.name}</span>
            <DisclosureBadge level={m.config.disclosure} />
          </p>
        </div>
        {!preparing && (
          <div className="flex items-center gap-3 text-xs text-ink-2" aria-label="会議の時計">
            <Icon name="clock" size={14} />
            <span className="tabular-nums">
              経過 <strong className="text-sm font-medium text-ink">{Math.floor(clock.elapsedMin)}</strong>分 / {m.config.durationMinutes}分
            </span>
            <TimeStatusText status={status} />
          </div>
        )}
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
      {!preparing && <PlanBar m={m} elapsed={clock.elapsedMin} />}
      <ol className="scroll-thin mx-auto flex max-w-[1600px] items-center gap-1 overflow-x-auto px-4 pb-3 sm:px-6" aria-label="フェーズ">
        <StepItem n={0} label="事前調査" state={preparing ? "current" : "past"} first />
        {type.phases.map((p, i) => (
          <StepItem key={p.id} n={i + 1} label={p.name} planned={m.clock.plan[i]?.plannedMin} state={preparing ? "future" : done ? "past" : i < m.phaseIndex ? "past" : i === m.phaseIndex ? "current" : "future"} />
        ))}
      </ol>
    </header>
  );
}

/** Done = ink-3 check, current = blue, upcoming = line. */
function StepItem({ n, label, state, first = false, planned }: { n: number; label: string; state: "past" | "current" | "future"; first?: boolean; planned?: number }) {
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
        {planned !== undefined && <span className="tabular-nums text-[10px] opacity-70">{fmtMin(planned)}分</span>}
      </li>
    </>
  );
}

/** Yellow dot = 押している, coral dot = 超過; the other states are plain text with a neutral dot. */
function TimeStatusText({ status }: { status: TimeStatus }) {
  const dot = status === "超過" ? "bg-coral" : status === "押している" ? "bg-yellow ring-1 ring-yellow-strong/40" : "bg-ink-3";
  return (
    <span className="inline-flex items-center gap-1.5 text-ink" title="時間の状況">
      <span aria-hidden className={`h-2 w-2 rounded-full ${dot}`} />
      {status}
    </span>
  );
}

/** Thin progress bar, one segment per phase, width = planned minutes. */
function PlanBar({ m, elapsed }: { m: MeetingState; elapsed: number }) {
  const type = getMeetingType(m.config.meetingTypeId);
  const plan = m.clock.plan;
  const total = plan.reduce((a, p) => a + p.plannedMin, 0) || 1;
  let start = 0;
  return (
    <div className="mx-auto max-w-[1600px] px-4 pb-2 sm:px-6">
      <div
        role="progressbar"
        aria-label="会議の進み具合"
        aria-valuemin={0}
        aria-valuemax={m.config.durationMinutes}
        aria-valuenow={Math.min(Math.round(elapsed), m.config.durationMinutes)}
        className="flex h-1.5 gap-0.5"
      >
        {plan.map((p, i) => {
          const from = start;
          start += p.plannedMin;
          const fill = Math.max(0, Math.min(1, (elapsed - (from / total) * m.config.durationMinutes) / ((p.plannedMin / total) * m.config.durationMinutes)));
          return (
            <div key={p.phaseId} title={`${type.phases[i]?.name ?? p.phaseId} 予定${fmtMin(p.plannedMin)}分`} style={{ flexGrow: p.plannedMin }} className="basis-0 overflow-hidden rounded-full bg-line">
              <div className="h-full bg-blue" style={{ width: `${fill * 100}%` }} />
            </div>
          );
        })}
      </div>
    </div>
  );
}
