"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { MeetingState, Participant, Proposal, ProposalStatus, SatisfactionReport, Stance } from "@/lib/types";
import { getMeetingType } from "@/data/meetingTypes";
import { getRole } from "@/data/roles";
import { COUNTRIES } from "@/data/countries";
import { isDegradedOutcome, useMeetingStore } from "@/store/meetingStore";
import { Badge, Button, Card, ConsentLegend, DisclosureBadge, EmptyState, Notice, PersonAvatar, ProposalStatusBadge, StanceDot, StanceLegend } from "@/components/ui";
import { Icon } from "@/components/ui/icons";
import { Markdown } from "@/components/ui/Markdown";
import { ResearchBriefCard } from "@/components/ui/ResearchBriefCard";
import { ProposalCard } from "@/components/meeting/SidePanel";
import { fmtMin } from "@/lib/engine/clock";
import type { Continuation } from "@/lib/types";
import { STANCE_LABEL, formatDate, formatUsd } from "@/components/ui/labels";
import { TONE_SURFACE, TONE_TEXT, consentStyle, exchangeKindStyle, pointKindStyle, type PointKind } from "@/components/ui/semantic";

type PMap = Record<string, Participant>;

function Section({ id, title, hint, children }: { id: string; title: string; hint?: ReactNode; children: ReactNode }) {
  return (
    <section id={id} className="scroll-mt-20 border-t border-line pt-8">
      <div className="mb-5 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h2 className="text-lg font-semibold text-ink">{title}</h2>
        {hint && <p className="text-xs text-ink-2">{hint}</p>}
      </div>
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
  const cs = consentStyle(r.consent);
  const shift = r.stanceShift;
  const lists: [PointKind, string[]][] = [
    ["agreed", r.agreedPoints],
    ["disagreed", r.disagreedPoints],
    ["concern", r.remainingConcerns],
    ["hope", r.hopes],
  ];
  return (
    <li className="rounded-md border border-line bg-white">
      <button type="button" aria-expanded={open} onClick={() => setOpen((o) => !o)} className="flex w-full items-center gap-3 p-3.5 text-left">
        {p && <PersonAvatar participant={p} size={40} />}
        <span className="min-w-0 flex-1">
          <span className="flex items-baseline justify-between gap-2">
            <span className="truncate text-sm font-medium">
              {p?.name ?? r.participantId}
              <span className="ml-2 text-xs font-normal text-ink-2">{p ? getRole(p.roleId)?.shortTitle : ""}</span>
            </span>
            <span className={`shrink-0 text-xs font-medium ${cs.text}`}>{cs.label}</span>
          </span>
          <span className="mt-1.5 flex items-center gap-3">
            <span className="h-2 flex-1 overflow-hidden rounded-full bg-subtle">
              <span className={`block h-full rounded-full transition-all ${cs.bar}`} style={{ width: `${Math.max(2, Math.min(100, r.score))}%` }} />
            </span>
            <span className="w-8 text-right text-sm font-semibold tabular-nums">{r.score}</span>
          </span>
          {shift && (
            <span className="mt-1.5 flex items-center gap-1.5 text-[11px] text-ink-2">
              <StanceDot stance={shift.from ?? init?.stance} /> {STANCE_LABEL[shift.from ?? init?.stance ?? "neutral"]}
              <Icon name="arrow-right" size={12} className="text-ink-3" />
              <StanceDot stance={shift.to} /> {STANCE_LABEL[shift.to]}
            </span>
          )}
        </span>
        <Icon name="chevron" size={14} className={`text-ink-3 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="space-y-3 border-t border-line px-3 py-3 text-sm">
          {r.comment && <p className="rounded-md rounded-tl-none bg-subtle px-3 py-2 leading-relaxed">「{r.comment}」</p>}
          {shift?.reason && <p className="text-xs text-ink-2">立場の変化：{shift.reason}</p>}
          <div className="grid gap-3 sm:grid-cols-2">
            {lists.map(([kind, items]) => {
              const pk = pointKindStyle(kind);
              return items.length ? (
                <div key={kind}>
                  <p className={`flex items-center gap-1.5 text-xs font-medium ${TONE_TEXT[pk.tone]}`}>
                    <Icon name={pk.icon} size={14} /> {pk.label}
                  </p>
                  <ul className="mt-1 list-disc space-y-0.5 pl-5 marker:text-ink-3">
                    {items.map((t, i) => (
                      <li key={i}>{t}</li>
                    ))}
                  </ul>
                </div>
              ) : null;
            })}
          </div>
        </div>
      )}
    </li>
  );
}

const CONVERGENCE: Record<Continuation["convergence"], { label: string; tone: "teal" | "yellow" | "coral" }> = {
  converged: { label: "収束", tone: "teal" },
  partially: { label: "一部収束", tone: "yellow" },
  not_converged: { label: "未収束", tone: "coral" },
};

function BulletCard({ title, icon, items, empty = "なし" }: { title: string; icon: "check" | "alert" | "arrow-right"; items: string[]; empty?: string }) {
  const tone = icon === "check" ? "text-teal-strong" : icon === "alert" ? "text-yellow-strong" : "text-blue";
  return (
    <Card className="p-4">
      <h3 className="mb-2 flex items-center gap-1.5 text-sm font-semibold">
        <Icon name={icon} size={14} className={tone} />
        {title}
      </h3>
      {items.length ? (
        <ul className="list-disc space-y-1 pl-5 text-sm leading-relaxed marker:text-ink-3">
          {items.map((t, i) => (
            <li key={i}>{t}</li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-ink-2">{empty}</p>
      )}
    </Card>
  );
}

function ContinuationSection({ m, pmap }: { m: MeetingState; pmap: PMap }) {
  const c = m.outcome!.continuation;
  const router = useRouter();
  if (!c) return null;
  const cv = CONVERGENCE[c.convergence];
  const session = m.config.carryOver?.sessionNumber ?? 1;
  return (
    <Section id="continuation" title="到達点と次回への持ち越し" hint={`第${session}回 ・ 会議時間 ${m.config.durationMinutes}分（実際の経過 ${fmtMin(m.clock?.elapsedMin ?? 0)}分）`}>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Badge tone={cv.tone}>{cv.label}</Badge>
        {c.timeUp && (
          <span className="inline-flex items-center gap-1.5 text-xs text-ink-2">
            <Icon name="clock" size={14} /> 時間切れで確認ラウンドに入りました
          </span>
        )}
      </div>
      <div className="rounded-lg border border-line border-l-2 border-l-ink bg-subtle p-5">
        <p className="mb-1 text-xs font-medium text-ink-2">どこまで進んだか</p>
        <p className="whitespace-pre-wrap text-base leading-8 text-ink">{c.reachedPoint}</p>
      </div>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <BulletCard title="ここまでに合意できたこと" icon="check" items={c.agreedSoFar} />
        <BulletCard title="残った論点" icon="alert" items={c.openIssues} />
      </div>
      <Card className="mt-3 p-4">
        <h3 className="mb-1 flex items-center gap-1.5 text-sm font-semibold">
          <Icon name="arrow-right" size={14} className="text-blue" />
          次回はここから
        </h3>
        <p className="text-sm leading-relaxed">{c.nextStartPoint}</p>
        {c.nextAgenda.length > 0 && (
          <>
            <p className="mb-1 mt-3 text-xs font-medium text-ink-2">次回の議題案</p>
            <ol className="list-decimal space-y-1 pl-5 text-sm leading-relaxed marker:text-ink-3">
              {c.nextAgenda.map((t, i) => (
                <li key={i}>{t}</li>
              ))}
            </ol>
          </>
        )}
        {c.homework.length > 0 && (
          <>
            <p className="mb-1 mt-3 text-xs font-medium text-ink-2">次回までの宿題</p>
            <ul className="space-y-1 text-sm leading-relaxed">
              {c.homework.map((h, i) => (
                <li key={i}>
                  <strong className="font-medium">{pmap[h.participantId]?.name ?? h.participantId}</strong>
                  <span className="text-ink-2">：</span>
                  {h.task}
                </li>
              ))}
            </ul>
          </>
        )}
      </Card>
      <div className="mt-5 flex flex-wrap items-center gap-3">
        <Button
          variant="primary"
          size="lg"
          onClick={() => {
            const nid = useMeetingStore.getState().createFollowUp(m.config.id);
            if (nid) router.push(`/meeting/${nid}`);
          }}
        >
          <Icon name="play" size={14} /> 続きの会議を開く
        </Button>
        <span className="text-xs text-ink-2">同じ参加者・設定で第{session + 1}回を開きます。事前調査は引き継がれ、今の最終スタンスから始まります。</span>
      </div>
    </Section>
  );
}

export function ResultsScreen({ id }: { id: string }) {
  const hydrated = useMeetingStore((s) => s.hydrated);
  const m = useMeetingStore((s) => s.meetings[id]);
  useEffect(() => {
    useMeetingStore.getState().hydrate();
  }, []);
  const pmap: PMap = useMemo(() => Object.fromEntries((m?.config.participants ?? []).map((p) => [p.id, p])), [m?.config.participants]);

  if (!hydrated) return <div className="grid min-h-screen place-items-center text-ink-2">読み込み中…</div>;
  if (!m)
    return (
      <div className="grid min-h-screen place-items-center px-4 text-center text-ink-2">
        <div>
          <p>会議が見つかりません。</p>
          <Link href="/" className="mt-3 inline-block text-blue underline underline-offset-2">
            ホームへ戻る
          </Link>
        </div>
      </div>
    );
  if (!m.outcome)
    return (
      <div className="grid min-h-screen place-items-center px-4 text-center text-ink-2">
        <div>
          <p>この会議はまだ終了していません。</p>
          <Link href={`/meeting/${id}`} className="mt-3 inline-block text-blue underline underline-offset-2">
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
    <div className="mx-auto w-full max-w-4xl space-y-12 px-4 pb-24 pt-6 sm:px-6">
      <nav className="flex items-center justify-between text-sm">
        <Link href="/" className="inline-flex items-center gap-1.5 text-ink-2 hover:text-ink">
          <Icon name="arrow-left" size={14} /> ホーム
        </Link>
        <Link href={`/meeting/${m.config.id}`} className="inline-flex items-center gap-1.5 text-ink-2 hover:text-ink">
          会議の様子を見返す <Icon name="arrow-right" size={14} />
        </Link>
      </nav>

      {degraded && (
        <Notice kind="warn" role="alert" className="justify-between">
          <span className="flex items-start gap-2">
            <Icon name="alert" size={16} className="mt-1 shrink-0 text-yellow-strong" />
            最終とりまとめの生成に失敗したため、簡易版の結果を表示しています。内容は機械的にまとめたもので、精度が低い場合があります。
          </span>
          <Button
            size="sm"
            onClick={() => {
              if (confirm("もう一度最終とりまとめを作成します（納得度の回答は再利用されます）。よろしいですか？")) {
                useMeetingStore.getState().regenerateOutcome(m.config.id);
                router.push(`/meeting/${m.config.id}`);
              }
            }}
          >
            <Icon name="refresh" size={12} /> もう一度まとめる
          </Button>
        </Notice>
      )}

      <header>
        <p className="text-xs font-medium tracking-wide text-ink-2">
          {m.config.carryOver && <span className="mr-2 text-ink">第{m.config.carryOver.sessionNumber}回</span>}
          {type.name}
        </p>
        <h1 className="mt-2 text-[28px] font-semibold leading-tight text-ink sm:text-4xl">{o.title || type.outputTitle}</h1>
        <p className="mt-3 text-base text-ink">議題：{m.config.topic}</p>
        <p className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-ink-2">
          <span className="tabular-nums">{formatDate(m.config.createdAt)}</span>
          <DisclosureBadge level={m.config.disclosure} />
          <span className="tabular-nums">{m.turn}ターン</span>
          <span className="tabular-nums">コスト {formatUsd(m.usage.estimatedCostUsd)}</span>
        </p>
        <ul className="mt-5 flex flex-wrap gap-2" aria-label="参加者">
          {m.config.participants.map((p) => {
            const c = COUNTRIES.find((x) => x.code === p.countryCode);
            return (
              <li key={p.id} className="flex items-center gap-1.5 rounded-full border border-line bg-white py-0.5 pl-0.5 pr-3 text-xs">
                <PersonAvatar participant={p} size={28} />
                <span>
                  {p.name}
                  <span className="text-ink-2">
                    {" "}
                    {c?.flag} {getRole(p.roleId)?.shortTitle}
                  </span>
                </span>
                {p.isFacilitator && <Icon name="gavel" size={12} className="text-blue" />}
              </li>
            );
          })}
        </ul>
      </header>

      <Section id="summary" title="エグゼクティブサマリー">
        <p className="whitespace-pre-wrap leading-8">{o.executiveSummary}</p>
      </Section>

      <Section id="landing" title="落とし所">
        <div className="rounded-lg border border-line border-l-2 border-l-ink bg-subtle p-6">
          <p className="whitespace-pre-wrap text-base font-medium leading-8 text-ink sm:text-lg">{o.landingZone}</p>
        </div>
      </Section>

      <Section id="decisions" title="決定事項・提言・政策案" hint="支持の内訳は参加者ごとのスタンス">
        <StanceLegend className="mb-4" />
        {grouped.length === 0 ? (
          <EmptyState>決定事項はありません。</EmptyState>
        ) : (
          <div className="space-y-6">
            {grouped.map(([st, list]) => (
              <div key={st}>
                <p className="mb-2 flex items-center gap-2 text-sm font-medium">
                  <ProposalStatusBadge status={st} />
                  <span className="text-xs tabular-nums text-ink-3">{list.length}件</span>
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

      <ContinuationSection m={m} pmap={pmap} />

      <Section id="satisfaction" title="納得度" hint="行をクリックすると詳細が開きます">
        <p className="mb-4 text-sm text-ink-2">
          全体の平均 <strong className="mx-1 text-2xl font-semibold tabular-nums text-ink">{avg}</strong> / 100
        </p>
        <div className="mb-4 space-y-1.5">
          <div className="flex flex-wrap items-center gap-x-3 text-[11px] text-ink-3">
            <span className="w-14">納得度</span>
            <ConsentLegend />
          </div>
          <div className="flex flex-wrap items-center gap-x-3 text-[11px] text-ink-3">
            <span className="w-14">スタンス</span>
            <StanceLegend />
          </div>
        </div>
        <ul className="space-y-2">
          {sat.map((r) => (
            <SatisfactionRow key={r.participantId} r={r} p={pmap[r.participantId]} init={m.initialStances[r.participantId]} />
          ))}
        </ul>
      </Section>

      <Section id="claims" title="各ステークホルダーの言い分">
        <div className="grid gap-3 sm:grid-cols-2">
          {o.stakeholderClaims.map((c) => {
            const p = pmap[c.participantId];
            return (
              <Card key={c.participantId} className="p-4">
                <div className="flex items-center gap-2.5">
                  {p && <PersonAvatar participant={p} size={40} />}
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{p?.name}</p>
                    <p className="truncate text-xs text-ink-2">{p ? getRole(p.roleId)?.title : ""}</p>
                  </div>
                </div>
                <p className="mt-3 text-sm leading-relaxed">
                  <span className="mr-1.5 text-xs font-medium text-ink-2">主張</span>
                  {c.claim}
                </p>
                <p className="mt-3 rounded-md bg-subtle px-3 py-2 text-xs leading-relaxed text-ink-2">
                  <span className="mr-1.5 font-medium text-ink">本当の利害</span>
                  {c.coreInterest}
                </p>
              </Card>
            );
          })}
        </div>
      </Section>

      <Section id="exchanges" title="重要なやりとり">
        {o.keyExchanges.length === 0 ? (
          <EmptyState>特筆すべきやりとりはありませんでした。</EmptyState>
        ) : (
          <ol className="relative space-y-5 border-l border-line pl-7">
            {o.keyExchanges.map((k) => {
              const meta = exchangeKindStyle(k.kind);
              const quotes = k.utteranceIds.map((uid) => uttById.get(uid)).filter((u): u is NonNullable<typeof u> => !!u);
              return (
                <li key={k.id} className="relative">
                  <span className={`absolute -left-[2.6rem] top-3.5 grid h-7 w-7 place-items-center rounded-full border ${TONE_SURFACE[meta.tone]} ${TONE_TEXT[meta.tone]}`}>
                    <Icon name={meta.icon} size={14} />
                  </span>
                  <Card className="p-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge tone={meta.tone}>{meta.label}</Badge>
                      <h3 className="font-semibold text-ink">{k.title}</h3>
                    </div>
                    <p className="mt-1.5 text-sm leading-relaxed">{k.summary}</p>
                    {quotes.length > 0 && (
                      <div className="mt-2 space-y-1.5">
                        {quotes.map((u) => (
                          <blockquote key={u.id} className="border-l-2 border-line bg-subtle px-3 py-2 text-sm leading-relaxed">
                            <span className="block text-xs font-medium text-ink-2">{pmap[u.speakerId]?.name}</span>
                            「{u.text}」
                          </blockquote>
                        ))}
                      </div>
                    )}
                    <p className="mt-2 text-xs leading-relaxed text-ink-2">意味：{k.significance}</p>
                  </Card>
                </li>
              );
            })}
          </ol>
        )}
      </Section>

      <Section id="next" title="未解決の論点と次のステップ">
        <div className="grid gap-3 sm:grid-cols-2">
          <Card className="p-4">
            <h3 className="mb-2 flex items-center gap-1.5 text-sm font-semibold"><Icon name="alert" size={14} className="text-yellow-strong" />未解決の論点</h3>
            {o.unresolvedIssues.length ? (
              <ul className="list-disc space-y-1 pl-5 text-sm marker:text-ink-3">
                {o.unresolvedIssues.map((t, i) => (
                  <li key={i}>{t}</li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-ink-2">なし</p>
            )}
          </Card>
          <Card className="p-4">
            <h3 className="mb-2 flex items-center gap-1.5 text-sm font-semibold"><Icon name="arrow-right" size={14} className="text-blue" />次のステップ</h3>
            {o.nextSteps.length ? (
              <ol className="list-decimal space-y-1 pl-5 text-sm marker:text-ink-3">
                {o.nextSteps.map((t, i) => (
                  <li key={i}>{t}</li>
                ))}
              </ol>
            ) : (
              <p className="text-sm text-ink-2">なし</p>
            )}
          </Card>
        </div>
      </Section>

      <Section id="research" title="各立場の事前調査">
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

      <Section id="minutes" title="議事録">
        <Card className="p-5 sm:p-8">
          <Markdown source={o.minutesMarkdown} />
        </Card>
        <div className="mt-4 flex flex-wrap gap-2">
          <Button onClick={() => download(`minutes-${m.config.id.slice(0, 8)}.md`, o.minutesMarkdown, "text/markdown")}>
            <Icon name="download" size={14} /> Markdownでダウンロード
          </Button>
          <Button onClick={() => download(`meeting-${m.config.id.slice(0, 8)}.json`, JSON.stringify(m, null, 2), "application/json")}>
            <Icon name="download" size={14} /> JSONでエクスポート
          </Button>
        </div>
      </Section>
    </div>
  );
}
