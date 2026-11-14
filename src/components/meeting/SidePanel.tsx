"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { MeetingState, Participant, Proposal, Stance, Utterance } from "@/lib/types";
import { getRole } from "@/data/roles";
import { Badge, EmptyState, PersonAvatar, StanceDot, Tabs } from "@/components/ui";
import { ResearchBriefCard } from "@/components/ui/ResearchBriefCard";
import { KEY_EXCHANGE_META, PROPOSAL_KIND_LABEL, PROPOSAL_STATUS_LABEL, PROPOSAL_STATUS_TONE, STANCES, STANCE_COLOR, STANCE_LABEL } from "@/components/ui/labels";

export type PanelTab = "log" | "summary" | "map" | "proposals" | "exchanges" | "research";

type PMap = Record<string, Participant>;

function Transcript({ utterances, pmap, focusId, stanceByUtt }: { utterances: Utterance[]; pmap: PMap; focusId?: string; stanceByUtt: boolean }) {
  const endRef = useRef<HTMLDivElement>(null);
  const [follow, setFollow] = useState(true);
  useEffect(() => {
    if (follow) endRef.current?.scrollIntoView({ block: "nearest" });
  }, [utterances.length, follow]);
  useEffect(() => {
    if (!focusId) return;
    setFollow(false);
    document.getElementById(`utt-${focusId}`)?.scrollIntoView({ block: "center", behavior: "smooth" });
  }, [focusId]);
  if (utterances.length === 0) return <EmptyState>発言はまだありません。</EmptyState>;
  return (
    <div className="space-y-2.5">
      {utterances.map((u) => {
        const p = pmap[u.speakerId];
        const color = u.stance && stanceByUtt ? STANCE_COLOR[u.stance] : "#d6d0c2";
        return (
          <article
            key={u.id}
            id={`utt-${u.id}`}
            className={`fade-up flex gap-2.5 rounded-xl border bg-card p-2.5 ${focusId === u.id ? "border-gold ring-2 ring-gold/30" : "border-line"} ${u.kind === "facilitation" ? "bg-paper-2/50" : ""}`}
            style={{ borderLeft: `4px solid ${color}` }}
          >
            {p && <PersonAvatar participant={p} size={34} />}
            <div className="min-w-0 flex-1">
              <p className="flex flex-wrap items-center gap-x-2 text-xs">
                <strong className="text-sm text-ink">{p?.name ?? "不明"}</strong>
                <span className="text-ink-soft">{p ? getRole(p.roleId)?.shortTitle : ""}</span>
                {u.kind === "facilitation" && <Badge tone="gold">🔨 進行</Badge>}
                {u.stance && <StanceDot stance={u.stance} withLabel />}
              </p>
              <p className="mt-0.5 whitespace-pre-wrap text-sm leading-relaxed">{u.text}</p>
              {u.innerThought && (
                <details className="mt-1 text-xs">
                  <summary className="cursor-pointer text-gold-dark">💭 本音を見る</summary>
                  <p className="mt-1 rounded-lg bg-gold-soft/50 px-2 py-1.5 italic leading-relaxed text-ink-soft">{u.innerThought}</p>
                </details>
              )}
            </div>
          </article>
        );
      })}
      <div ref={endRef} />
    </div>
  );
}

function SummaryTab({ m }: { m: MeetingState }) {
  const { summary, agendaItems } = m.minutes;
  if (!summary && agendaItems.length === 0) return <EmptyState>書記が議事要旨をまとめるまでお待ちください。</EmptyState>;
  return (
    <div className="space-y-4 text-sm">
      {summary && (
        <div className="rounded-xl border border-line bg-card p-3">
          <p className="mb-1 text-xs font-bold text-gold-dark">議事要旨</p>
          <p className="whitespace-pre-wrap leading-relaxed">{summary}</p>
        </div>
      )}
      {agendaItems.map((a, i) => (
        <div key={`${a.phaseId}-${i}`}>
          <p className="font-bold text-navy">{a.title}</p>
          <ul className="mt-1 list-disc space-y-0.5 pl-5 text-ink-soft marker:text-gold">
            {a.points.map((pt, j) => (
              <li key={j}>{pt}</li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

function IssueMap({ m, pmap }: { m: MeetingState; pmap: PMap }) {
  const issues = m.minutes.issues;
  if (issues.length === 0) return <EmptyState>論点はまだ整理されていません。</EmptyState>;
  return (
    <div className="space-y-4">
      {issues.map((is) => (
        <div key={is.id} className="rounded-xl border border-line bg-card p-3">
          <p className="flex items-start justify-between gap-2 text-sm font-bold">
            <span>{is.title}</span>
            {is.resolved && <Badge tone="green">解決</Badge>}
          </p>
          <div className="mt-2 grid grid-cols-5 gap-1 rounded-lg bg-gradient-to-r from-rose-100 via-stone-100 to-emerald-100 p-1.5">
            {STANCES.map((st) => (
              <div key={st} className="flex min-h-12 flex-wrap content-start justify-center gap-1">
                {is.positions
                  .filter((pos) => pos.stance === st)
                  .map((pos) => {
                    const p = pmap[pos.participantId];
                    if (!p) return null;
                    return (
                      <span key={pos.participantId} title={`${p.name}\n主張：${pos.position}${pos.interest ? `\n本当の利害：${pos.interest}` : ""}`}>
                        <PersonAvatar participant={p} size={28} ring={STANCE_COLOR[st]} />
                      </span>
                    );
                  })}
              </div>
            ))}
          </div>
          <div className="mt-0.5 flex justify-between px-1 text-[10px] text-ink-soft">
            <span>← 反対</span>
            <span>支持 →</span>
          </div>
          {is.landingZone && (
            <p className="mt-2 rounded-lg border border-gold/50 bg-gold-soft/60 px-2.5 py-1.5 text-xs leading-relaxed">
              <strong className="text-gold-dark">落とし所の候補：</strong>
              {is.landingZone}
            </p>
          )}
          <details className="mt-2 text-xs">
            <summary className="cursor-pointer text-ink-soft">各人の主張と利害</summary>
            <ul className="mt-1.5 space-y-1.5">
              {is.positions.map((pos) => (
                <li key={pos.participantId} className="leading-relaxed">
                  <StanceDot stance={pos.stance} /> <strong>{pmap[pos.participantId]?.name}</strong>：{pos.position}
                  {pos.interest && <span className="block pl-4 text-ink-soft">利害：{pos.interest}</span>}
                </li>
              ))}
            </ul>
          </details>
        </div>
      ))}
    </div>
  );
}

export function SupportDots({ support, pmap }: { support: Record<string, Stance>; pmap: PMap }) {
  const entries = Object.entries(support);
  if (entries.length === 0) return <p className="text-xs text-ink-faint">支持の表明はまだありません</p>;
  return (
    <div className="flex flex-wrap gap-1.5">
      {entries.map(([pid, st]) => (
        <span key={pid} className="inline-flex items-center gap-1 rounded-full bg-paper-2 px-1.5 py-0.5 text-[11px]" title={`${pmap[pid]?.name ?? pid}：${STANCE_LABEL[st]}`}>
          <StanceDot stance={st} size={9} />
          {pmap[pid]?.name.split(/\s|　/)[0]}
        </span>
      ))}
    </div>
  );
}

export function ProposalCard({ p, pmap }: { p: Proposal; pmap: PMap }) {
  return (
    <div className="rounded-xl border border-line bg-card p-3 text-sm">
      <div className="flex flex-wrap items-center gap-1.5">
        <Badge tone={PROPOSAL_STATUS_TONE[p.status]}>{PROPOSAL_STATUS_LABEL[p.status]}</Badge>
        <Badge>{PROPOSAL_KIND_LABEL[p.kind]}</Badge>
      </div>
      <p className="mt-1.5 font-bold text-navy">{p.title}</p>
      <p className="mt-0.5 text-xs text-ink-soft">提案：{pmap[p.proposedBy]?.name ?? "—"}</p>
      <p className="mt-1.5 whitespace-pre-wrap leading-relaxed">{p.body}</p>
      {p.conditions && p.conditions.length > 0 && (
        <ul className="mt-1.5 list-disc pl-5 text-xs text-ink-soft">
          {p.conditions.map((c, i) => (
            <li key={i}>{c}</li>
          ))}
        </ul>
      )}
      <div className="mt-2">
        <SupportDots support={p.support} pmap={pmap} />
      </div>
    </div>
  );
}

function ExchangeList({ m, pmap, seen, onJump }: { m: MeetingState; pmap: PMap; seen: Set<string>; onJump: (uttId: string) => void }) {
  // Only show exchanges whose utterances the typewriter has already revealed.
  const list = m.minutes.keyExchanges.filter((k) => k.utteranceIds.every((u) => seen.has(u)));
  if (list.length === 0) return <EmptyState>重要なやりとりはまだありません。</EmptyState>;
  return (
    <div className="space-y-3">
      {list.map((k) => {
        const meta = KEY_EXCHANGE_META[k.kind];
        return (
          <div key={k.id} className="rounded-xl border border-line bg-card p-3 text-sm">
            <div className="flex items-center gap-2">
              <span className="text-lg" aria-hidden>
                {meta.icon}
              </span>
              <Badge tone={meta.tone}>{meta.label}</Badge>
            </div>
            <p className="mt-1 font-bold text-navy">{k.title}</p>
            <p className="mt-1 leading-relaxed">{k.summary}</p>
            <p className="mt-1 text-xs leading-relaxed text-ink-soft">意味：{k.significance}</p>
            <div className="mt-2 flex items-center justify-between">
              <span className="flex -space-x-1.5">
                {k.participantIds.map((id) => pmap[id] && <PersonAvatar key={id} participant={pmap[id]} size={24} />)}
              </span>
              {k.utteranceIds[0] && (
                <button type="button" onClick={() => onJump(k.utteranceIds[0])} className="text-xs text-sky-700 underline underline-offset-2">
                  発言録で見る
                </button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function SidePanel({
  m,
  utterances,
  tab,
  onTab,
  focusId,
  onJump,
}: {
  m: MeetingState;
  utterances: Utterance[];
  tab: PanelTab;
  onTab: (t: PanelTab) => void;
  focusId?: string;
  onJump: (uttId: string) => void;
}) {
  const pmap = useMemo(() => Object.fromEntries(m.config.participants.map((p) => [p.id, p])), [m.config.participants]);
  const seen = useMemo(() => new Set(utterances.map((u) => u.id)), [utterances]);
  const exchangeCount = m.minutes.keyExchanges.filter((k) => k.utteranceIds.every((u) => seen.has(u))).length;
  const hasMinutes = m.minutes.proposals.length;
  return (
    <div className="flex h-full min-h-0 flex-col">
      <Tabs<PanelTab>
        className="shrink-0"
        value={tab}
        onChange={onTab}
        tabs={[
          { id: "log", label: "発言録", count: utterances.length },
          { id: "summary", label: "議事要旨" },
          { id: "map", label: "論点マップ", count: m.minutes.issues.length },
          { id: "proposals", label: "提案・決定", count: hasMinutes },
          { id: "exchanges", label: "重要なやりとり", count: exchangeCount },
          { id: "research", label: "事前調査", count: Object.values(m.research ?? {}).filter((b) => b.status === "done").length },
        ]}
      />
      <div className="scroll-thin min-h-0 flex-1 overflow-y-auto py-3 pr-1">
        {tab === "log" && <Transcript utterances={utterances} pmap={pmap} focusId={focusId} stanceByUtt />}
        {tab === "summary" && <SummaryTab m={m} />}
        {tab === "map" && <IssueMap m={m} pmap={pmap} />}
        {tab === "proposals" &&
          (m.minutes.proposals.length === 0 ? (
            <EmptyState>提案はまだ出ていません。</EmptyState>
          ) : (
            <div className="space-y-3">
              {m.minutes.proposals.map((p) => (
                <ProposalCard key={p.id} p={p} pmap={pmap} />
              ))}
            </div>
          ))}
        {tab === "exchanges" && <ExchangeList m={m} pmap={pmap} seen={seen} onJump={onJump} />}
        {tab === "research" && (
          <div className="space-y-2">
            {m.config.participants.map((p) => (
              <ResearchBriefCard key={p.id} participant={p} brief={m.research?.[p.id]} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
