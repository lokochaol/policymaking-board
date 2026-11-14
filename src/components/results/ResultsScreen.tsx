"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { MeetingState, Participant, Proposal, ProposalStatus, SatisfactionReport, Stance } from "@/lib/types";
import { getMeetingType } from "@/data/meetingTypes";
import { getRole } from "@/data/roles";
import { COUNTRIES } from "@/data/countries";
import { isDegradedOutcome, useMeetingStore } from "@/store/meetingStore";
import { Badge, Button, Card, DisclosureBadge, EmptyState, PersonAvatar, StanceDot } from "@/components/ui";
import { Markdown } from "@/components/ui/Markdown";
import { ResearchBriefCard } from "@/components/ui/ResearchBriefCard";
import { ProposalCard } from "@/components/meeting/SidePanel";
import { CONSENT_COLOR, CONSENT_LABEL, KEY_EXCHANGE_META, PROPOSAL_STATUS_LABEL, STANCE_LABEL, formatDate, formatUsd } from "@/components/ui/labels";

type PMap = Record<string, Participant>;

function Section({ id, title, icon, children }: { id: string; title: string; icon: string; children: ReactNode }) {
  return (
    <section id={id} className="scroll-mt-20">
      <h2 className="font-display mb-3 flex items-center gap-2 text-lg font-bold text-navy sm:text-xl">
        <span aria-hidden>{icon}</span>
        {title}
      </h2>
      {children}
    </section>
  );
}

function download(filename: string, text: string, mime: string) {
  const blob = new Blob([text], { type: `${mime};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

const DECISION_ORDER: ProposalStatus[] = ["agreed", "conditionally_agreed", "both_views", "deferred", "rejected", "discussing", "draft"];

function SatisfactionRow({ r, p, init }: { r: SatisfactionReport; p?: Participant; init?: { stance: Stance; summary: string } }) {
  const [open, setOpen] = useState(false);
  const color = CONSENT_COLOR[r.consent] ?? "#999";
  const shift = r.stanceShift;
  const lists: [string, string, string[]][] = [
    ["✅", "納得している点", r.agreedPoints],
    ["❌", "納得していない点", r.disagreedPoints],
    ["⚠️", "残る懸念", r.remainingConcerns],
    ["🌱", "希望", r.hopes],
  ];
  return (
    <li className="rounded-xl border border-line bg-card">
      <button type="button" aria-expanded={open} onClick={() => setOpen((o) => !o)} className="flex w-full items-center gap-3 p-3 text-left">
        {p && <PersonAvatar participant={p} size={40} />}
        <span className="min-w-0 flex-1">
          <span className="flex items-baseline justify-between gap-2">
            <span className="truncate text-sm font-bold">
              {p?.name ?? r.participantId}
              <span className="ml-2 text-xs font-normal text-ink-soft">{p ? getRole(p.roleId)?.shortTitle : ""}</span>
            </span>
            <span className="shrink-0 text-xs" style={{ color }}>
              {CONSENT_LABEL[r.consent]}
            </span>
          </span>
          <span className="mt-1 flex items-center gap-2">
            <span className="h-3 flex-1 overflow-hidden rounded-full bg-paper-2">
              <span className="block h-full rounded-full transition-all" style={{ width: `${Math.max(2, Math.min(100, r.score))}%`, background: color }} />
            </span>
            <span className="w-8 text-right text-sm font-bold tabular-nums">{r.score}</span>
          </span>
          {shift && (
            <span className="mt-1 flex items-center gap-1.5 text-[11px] text-ink-soft">
              <StanceDot stance={shift.from ?? init?.stance} /> {STANCE_LABEL[shift.from ?? init?.stance ?? "neutral"]}
              <span aria-hidden className="text-gold-dark">
                →
              </span>
              <StanceDot stance={shift.to} /> {STANCE_LABEL[shift.to]}
            </span>
          )}
        </span>
        <span className="text-xs text-ink-faint">{open ? "▲" : "▼"}</span>
      </button>
      {open && (
        <div className="space-y-3 border-t border-line px-3 py-3 text-sm">
          {r.comment && <p className="rounded-2xl rounded-tl-sm bg-gold-soft/60 px-3 py-2 leading-relaxed">「{r.comment}」</p>}
          {shift?.reason && <p className="text-xs text-ink-soft">立場の変化：{shift.reason}</p>}
          <div className="grid gap-3 sm:grid-cols-2">
            {lists.map(([ic, label, items]) =>
              items.length ? (
                <div key={label}>
                  <p className="text-xs font-bold text-ink-soft">
                    {ic} {label}
                  </p>
                  <ul className="mt-1 list-disc space-y-0.5 pl-5">
                    {items.map((t, i) => (
                      <li key={i}>{t}</li>
                    ))}
                  </ul>
                </div>
              ) : null,
            )}
          </div>
        </div>
      )}
    </li>
  );
}

export function ResultsScreen({ id }: { id: string }) {
  const hydrated = useMeetingStore((s) => s.hydrated);
  const m = useMeetingStore((s) => s.meetings[id]);
  useEffect(() => {
    useMeetingStore.getState().hydrate();
  }, []);
  const pmap: PMap = useMemo(() => Object.fromEntries((m?.config.participants ?? []).map((p) => [p.id, p])), [m?.config.participants]);

  if (!hydrated) return <div className="grid min-h-screen place-items-center text-ink-soft">読み込み中…</div>;
  if (!m)
    return (
      <div className="grid min-h-screen place-items-center px-4 text-center text-ink-soft">
        <div>
          <p>会議が見つかりません。</p>
          <Link href="/" className="mt-3 inline-block text-sky-700 underline">
            ホームへ戻る
          </Link>
        </div>
      </div>
    );
  if (!m.outcome)
    return (
      <div className="grid min-h-screen place-items-center px-4 text-center text-ink-soft">
        <div>
          <p>この会議はまだ終了していません。</p>
          <Link href={`/meeting/${id}`} className="mt-3 inline-block text-sky-700 underline">
            会議に戻る
          </Link>
        </div>
      </div>
    );
  return <Dashboard m={m} pmap={pmap} />;
}

function Dashboard({ m, pmap }: { m: MeetingState; pmap: PMap }) {
  const o = m.outcome!;
  const type = getMeetingType(m.config.meetingTypeId);
  const grouped = DECISION_ORDER.map((st) => [st, o.decisions.filter((d) => d.status === st)] as [ProposalStatus, Proposal[]]).filter(([, l]) => l.length);
  const sat = [...o.satisfaction].sort((a, b) => b.score - a.score);
  const avg = sat.length ? Math.round(sat.reduce((s, r) => s + r.score, 0) / sat.length) : 0;
  const uttById = new Map(m.utterances.map((u) => [u.id, u]));
  const researched = m.config.participants.filter((p) => m.research?.[p.id]);
  const router = useRouter();
  const degraded = isDegradedOutcome(o);

  return (
    <div className="mx-auto w-full max-w-4xl space-y-10 px-4 pb-24 pt-5 sm:px-6">
      <nav className="flex items-center justify-between text-sm">
        <Link href="/" className="text-ink-soft hover:text-ink">
          ← ホーム
        </Link>
        <Link href={`/meeting/${m.config.id}`} className="text-ink-soft hover:text-ink">
          会議の様子を見返す
        </Link>
      </nav>

      {degraded && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900" role="alert">
          <span>⚠ 最終とりまとめの生成に失敗したため、簡易版の結果を表示しています。内容は機械的にまとめたもので、精度が低い場合があります。</span>
          <Button
            size="sm"
            variant="primary"
            onClick={() => {
              if (confirm("もう一度最終とりまとめを作成します（納得度の回答は再利用されます）。よろしいですか？")) {
                useMeetingStore.getState().regenerateOutcome(m.config.id);
                router.push(`/meeting/${m.config.id}`);
              }
            }}
          >
            もう一度まとめる
          </Button>
        </div>
      )}

      <header className="rounded-3xl border border-line bg-gradient-to-br from-card to-gold-soft/50 p-5 shadow-lift sm:p-8">
        <p className="text-xs tracking-widest text-gold-dark">{type.name}</p>
        <h1 className="font-display mt-1 text-3xl font-bold text-navy sm:text-4xl">{o.title || type.outputTitle}</h1>
        <p className="mt-2 text-base font-medium sm:text-lg">議題：{m.config.topic}</p>
        <p className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-ink-soft">
          <span>{formatDate(m.config.createdAt)}</span>
          <DisclosureBadge level={m.config.disclosure} />
          <span>{m.turn}ターン</span>
          <span>コスト {formatUsd(m.usage.estimatedCostUsd)}</span>
        </p>
        <ul className="mt-4 flex flex-wrap gap-2" aria-label="参加者">
          {m.config.participants.map((p) => {
            const c = COUNTRIES.find((x) => x.code === p.countryCode);
            return (
              <li key={p.id} className="flex items-center gap-1.5 rounded-full bg-card/80 py-0.5 pl-0.5 pr-3 text-xs shadow-soft">
                <PersonAvatar participant={p} size={30} />
                <span>
                  {p.name}
                  <span className="text-ink-soft">
                    {" "}
                    {c?.flag} {getRole(p.roleId)?.shortTitle}
                  </span>
                  {p.isFacilitator && " 🔨"}
                </span>
              </li>
            );
          })}
        </ul>
      </header>

      <Section id="summary" title="エグゼクティブサマリー" icon="📋">
        <Card className="p-5">
          <p className="whitespace-pre-wrap leading-8">{o.executiveSummary}</p>
        </Card>
      </Section>

      <Section id="landing" title="落とし所" icon="🎯">
        <div className="rounded-2xl border-2 border-gold/60 bg-gradient-to-br from-gold-soft to-card p-6 shadow-lift">
          <p className="whitespace-pre-wrap font-display text-base font-medium leading-8 text-navy sm:text-lg">{o.landingZone}</p>
        </div>
      </Section>

      <Section id="decisions" title="決定事項・提言・政策案" icon="📜">
        {grouped.length === 0 ? (
          <EmptyState>決定事項はありません。</EmptyState>
        ) : (
          <div className="space-y-6">
            {grouped.map(([st, list]) => (
              <div key={st}>
                <p className="mb-2 flex items-center gap-2 text-sm font-bold">
                  {PROPOSAL_STATUS_LABEL[st]}
                  <Badge>{list.length}</Badge>
                </p>
                <div className="grid gap-3 sm:grid-cols-2">
                  {list.map((d) => (
                    <div key={d.id}>
                      <ProposalCard p={d} pmap={pmap} />
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </Section>

      <Section id="satisfaction" title="納得度" icon="📊">
        <p className="mb-3 text-sm text-ink-soft">
          全体の平均 <strong className="text-lg text-navy">{avg}</strong> / 100 ・ 行をクリックすると詳細が開きます
        </p>
        <div className="mb-3 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-ink-soft">
          {[5, 4, 3, 2, 1].map((c) => (
            <span key={c} className="flex items-center gap-1">
              <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: CONSENT_COLOR[c] }} />
              {CONSENT_LABEL[c]}
            </span>
          ))}
        </div>
        <ul className="space-y-2">
          {sat.map((r) => (
            <SatisfactionRow key={r.participantId} r={r} p={pmap[r.participantId]} init={m.initialStances[r.participantId]} />
          ))}
        </ul>
      </Section>

      <Section id="claims" title="各ステークホルダーの言い分" icon="🗣️">
        <div className="grid gap-3 sm:grid-cols-2">
          {o.stakeholderClaims.map((c) => {
            const p = pmap[c.participantId];
            return (
              <Card key={c.participantId} className="p-4">
                <div className="flex items-center gap-2.5">
                  {p && <PersonAvatar participant={p} size={40} />}
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold">{p?.name}</p>
                    <p className="truncate text-xs text-ink-soft">{p ? getRole(p.roleId)?.title : ""}</p>
                  </div>
                </div>
                <p className="mt-3 text-sm leading-relaxed">
                  <span className="mr-1 text-xs font-bold text-gold-dark">主張</span>
                  {c.claim}
                </p>
                <p className="mt-2 rounded-lg bg-paper-2 px-2.5 py-1.5 text-xs leading-relaxed text-ink-soft">
                  <span className="mr-1 font-bold text-navy">本当の利害</span>
                  {c.coreInterest}
                </p>
              </Card>
            );
          })}
        </div>
      </Section>

      <Section id="exchanges" title="重要なやりとり" icon="⚡">
        {o.keyExchanges.length === 0 ? (
          <EmptyState>特筆すべきやりとりはありませんでした。</EmptyState>
        ) : (
          <ol className="relative space-y-5 border-l-2 border-gold/40 pl-6">
            {o.keyExchanges.map((k) => {
              const meta = KEY_EXCHANGE_META[k.kind];
              const quotes = k.utteranceIds.map((uid) => uttById.get(uid)).filter((u): u is NonNullable<typeof u> => !!u);
              return (
                <li key={k.id} className="relative">
                  <span className="absolute -left-[2.15rem] top-0 grid h-7 w-7 place-items-center rounded-full border-2 border-gold/50 bg-card text-sm">{meta.icon}</span>
                  <Card className="p-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge tone={meta.tone}>{meta.label}</Badge>
                      <h3 className="font-bold text-navy">{k.title}</h3>
                    </div>
                    <p className="mt-1.5 text-sm leading-relaxed">{k.summary}</p>
                    {quotes.length > 0 && (
                      <div className="mt-2 space-y-1.5">
                        {quotes.map((u) => (
                          <blockquote key={u.id} className="border-l-4 border-gold/50 bg-paper-2/60 px-3 py-1.5 text-sm leading-relaxed">
                            <span className="block text-xs font-bold text-ink-soft">{pmap[u.speakerId]?.name}</span>
                            「{u.text}」
                          </blockquote>
                        ))}
                      </div>
                    )}
                    <p className="mt-2 text-xs leading-relaxed text-ink-soft">意味：{k.significance}</p>
                  </Card>
                </li>
              );
            })}
          </ol>
        )}
      </Section>

      <Section id="next" title="未解決の論点と次のステップ" icon="🧭">
        <div className="grid gap-3 sm:grid-cols-2">
          <Card className="p-4">
            <h3 className="mb-2 text-sm font-bold">未解決の論点</h3>
            {o.unresolvedIssues.length ? (
              <ul className="list-disc space-y-1 pl-5 text-sm marker:text-rose-400">
                {o.unresolvedIssues.map((t, i) => (
                  <li key={i}>{t}</li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-ink-soft">なし</p>
            )}
          </Card>
          <Card className="p-4">
            <h3 className="mb-2 text-sm font-bold">次のステップ</h3>
            {o.nextSteps.length ? (
              <ol className="list-decimal space-y-1 pl-5 text-sm marker:text-gold-dark">
                {o.nextSteps.map((t, i) => (
                  <li key={i}>{t}</li>
                ))}
              </ol>
            ) : (
              <p className="text-sm text-ink-soft">なし</p>
            )}
          </Card>
        </div>
      </Section>

      <Section id="research" title="各立場の事前調査" icon="🔍">
        {researched.length === 0 ? (
          <EmptyState>事前調査の記録はありません。</EmptyState>
        ) : (
          <div className="space-y-2">
            {researched.map((p) => (
              <ResearchBriefCard key={p.id} participant={p} brief={m.research[p.id]} />
            ))}
          </div>
        )}
      </Section>

      <Section id="minutes" title="議事録" icon="🗒️">
        <Card className="p-5 sm:p-8">
          <Markdown source={o.minutesMarkdown} />
        </Card>
        <div className="mt-4 flex flex-wrap gap-2">
          <Button variant="primary" onClick={() => download(`minutes-${m.config.id.slice(0, 8)}.md`, o.minutesMarkdown, "text/markdown")}>
            ⬇ Markdownでダウンロード
          </Button>
          <Button onClick={() => download(`meeting-${m.config.id.slice(0, 8)}.json`, JSON.stringify(m, null, 2), "application/json")}>⬇ JSONでエクスポート</Button>
        </div>
      </Section>
    </div>
  );
}
