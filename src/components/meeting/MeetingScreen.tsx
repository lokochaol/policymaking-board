"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { Participant, Stance } from "@/lib/types";
import { getMeetingType } from "@/data/meetingTypes";
import { getRole } from "@/data/roles";
import Room from "@/components/room/Room";
import { SPEEDS, useMeetingStore, type SpeedId } from "@/store/meetingStore";
import { Badge, Button, Card, PersonAvatar } from "@/components/ui";
import { STANCE_COLOR } from "@/components/ui/labels";
import { StorageWarning } from "@/components/ui/StorageWarning";
import { TopBar } from "./TopBar";
import { SidePanel, type PanelTab } from "./SidePanel";
import { useTypewriter } from "./useTypewriter";

export function MeetingScreen({ id }: { id: string }) {
  const router = useRouter();
  const hydrated = useMeetingStore((s) => s.hydrated);
  const m = useMeetingStore((s) => s.meetings[id]);
  const shownRaw = useMeetingStore((s) => s.shown[id]);
  const busy = useMeetingStore((s) => s.busy[id]);
  const speed = useMeetingStore((s) => s.speed);
  const store = useMeetingStore;

  const [tab, setTab] = useState<PanelTab>("log");
  const [panelOpen, setPanelOpen] = useState(true);
  const [honneOverride, setHonneOverride] = useState<boolean>();
  const [focusId, setFocusId] = useState<string>();
  const wasActive = useRef(false);

  useEffect(() => {
    store.getState().hydrate();
  }, [store]);

  const exists = !!m;
  useEffect(() => {
    if (!hydrated || !exists) return;
    store.getState().attach(id);
    return () => store.getState().detach(id);
  }, [hydrated, exists, id, store]);

  const status = m?.status;
  useEffect(() => {
    if (!status) return;
    if (status !== "finished") wasActive.current = true;
    else if (wasActive.current) router.push(`/meeting/${id}/results`);
  }, [status, id, router]);

  const shownCount = m ? Math.min(shownRaw ?? m.utterances.length, m.utterances.length) : 0;
  const shownUtts = useMemo(() => (m ? m.utterances.slice(0, shownCount) : []), [m, shownCount]);
  const current = shownUtts[shownUtts.length - 1];
  const cps = SPEEDS[speed].cps;
  const typed = useTypewriter(current?.text ?? "", current?.id, cps);

  const pmap = useMemo(() => Object.fromEntries((m?.config.participants ?? []).map((p) => [p.id, p])) as Record<string, Participant>, [m?.config.participants]);

  const stances = useMemo(() => {
    const out: Record<string, Stance> = {};
    if (!m) return out;
    for (const [pid, v] of Object.entries(m.initialStances)) out[pid] = v.stance;
    for (const u of shownUtts) if (u.stance) out[u.speakerId] = u.stance;
    return out;
  }, [m, shownUtts]);

  const honne = honneOverride ?? m?.config.disclosure === "offrecord";
  const preparing = m?.status === "preparing";

  const thoughts = useMemo(() => {
    const out: Record<string, string> = {};
    if (!m) return out;
    if (preparing) {
      for (const p of m.config.participants) {
        const b = m.research?.[p.id];
        out[p.id] =
          b?.status === "done" ? `✅ 準備完了${b.queries.length ? `（検索${b.queries.length}回）` : ""}` : b?.status === "failed" ? "⚠ 調査できず" : b?.status === "researching" ? `🔍 ${b.queries.at(-1) ?? "調査中…"}` : "…順番待ち";
      }
      return out;
    }
    const seen = new Set<string>();
    for (let i = shownUtts.length - 1; i >= 0 && seen.size < 3; i--) {
      const u = shownUtts[i];
      if (u.innerThought && !seen.has(u.speakerId)) {
        seen.add(u.speakerId);
        out[u.speakerId] = u.innerThought;
      }
    }
    return out;
  }, [m, preparing, shownUtts]);

  if (!hydrated) return <Centered>読み込み中…</Centered>;
  if (!m)
    return (
      <Centered>
        <p>会議が見つかりません。</p>
        <Link href="/" className="mt-3 inline-block text-sky-700 underline">
          ホームへ戻る
        </Link>
      </Centered>
    );

  const type = getMeetingType(m.config.meetingTypeId);
  const phase = type.phases[Math.min(m.phaseIndex, type.phases.length - 1)];
  const activeProposal = [...m.minutes.proposals].reverse().find((p) => p.status === "discussing" || p.status === "draft");
  const speaker = current ? pmap[current.speakerId] : undefined;
  const researchTotal = m.config.participants.length;
  const researchDone = Object.values(m.research ?? {}).filter((b) => b.status === "done" || b.status === "failed").length;
  const st = m.status;
  const act = store.getState();

  const speakingNow = !preparing && !!speaker && st !== "finished";

  return (
    <div className="flex min-h-screen flex-col pb-44 sm:pb-24">
      <TopBar m={m} />
      <StorageWarning />

      {preparing && (
        <div className="border-b border-gold/30 bg-gold-soft/70 px-4 py-3 text-center text-sm" role="status">
          <span className="font-bold text-navy">🔍 事前調査中</span>
          <span className="ml-2 text-ink-soft">
            参加者それぞれが、自分なりのやり方で議題を調べています（{researchDone}/{researchTotal}）
          </span>
          <div className="mx-auto mt-2 h-1.5 max-w-md overflow-hidden rounded-full bg-white/70">
            <div className="h-full rounded-full bg-gold transition-all" style={{ width: `${(researchDone / Math.max(researchTotal, 1)) * 100}%` }} />
          </div>
        </div>
      )}
      {st === "closing" && (
        <div className="border-b border-gold/30 bg-gold-soft/70 px-4 py-3 text-center text-sm" role="status">
          <span className="pulse-dot">📝</span> 閉会処理中…納得度の集計と議事録の作成をしています
        </div>
      )}
      {st === "error" && (
        <div className="flex flex-wrap items-center justify-center gap-3 border-b border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800" role="alert">
          <span>エラーが発生しました：{m.error}</span>
          <Button size="sm" variant="primary" onClick={() => act.retry(id)}>
            再試行
          </Button>
        </div>
      )}

      <div className={`mx-auto grid w-full max-w-[1600px] flex-1 grid-cols-[minmax(0,1fr)] gap-4 p-3 sm:p-5 ${panelOpen ? "lg:grid-cols-[minmax(0,1fr)_380px]" : ""}`}>
        <main className="min-w-0 space-y-3">
          <div className="overflow-hidden rounded-2xl border border-line bg-navy-dark shadow-lift">
            <Room
              theme={type.roomTheme}
              participants={m.config.participants}
              speakingId={speakingNow ? current?.speakerId : undefined}
              bubbleText={speakingNow ? typed.shown : undefined}
              stances={stances}
              thoughts={thoughts}
              showThoughts={preparing || honne}
              boardTitle={preparing ? "事前調査" : phase?.name}
              boardSubtitle={preparing ? `${researchDone}/${researchTotal} 完了` : activeProposal?.title}
              className="block h-auto w-full"
            />
          </div>

          <Card className="min-h-28 p-4" as="section">
            {preparing ? (
              <p className="text-sm text-ink-soft">全員の準備ができると、自動的に開会します。「事前調査」タブで各自の調査メモを見られます。</p>
            ) : speaker && current ? (
              <div className="flex items-start gap-3" aria-live="polite">
                <PersonAvatar participant={speaker} size={44} ring={current.stance ? STANCE_COLOR[current.stance] : undefined} />
                <div className="min-w-0 flex-1">
                  <p className="flex flex-wrap items-center gap-2 text-sm">
                    <strong>{speaker.name}</strong>
                    <span className="text-xs text-ink-soft">{getRole(speaker.roleId)?.title}</span>
                    {current.kind === "facilitation" && <Badge tone="gold">🔨 進行</Badge>}
                  </p>
                  <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed sm:text-base">
                    {typed.shown}
                    {!typed.done && <span className="pulse-dot">▍</span>}
                  </p>
                  {honne && current.innerThought && typed.done && <p className="mt-2 rounded-lg bg-gold-soft/60 px-3 py-1.5 text-xs italic leading-relaxed text-ink-soft">💭 {current.innerThought}</p>}
                </div>
              </div>
            ) : (
              <p className="text-sm text-ink-soft">{st === "paused" ? "一時停止中です。「再開」または「1ターン進める」を押してください。" : "まもなく開会します…"}</p>
            )}
          </Card>

          {st === "finished" && (
            <div className="text-center">
              <Link href={`/meeting/${id}/results`} className="inline-flex rounded-full bg-gold px-8 py-3 font-medium text-white shadow-lift hover:bg-gold-dark">
                結果を見る →
              </Link>
            </div>
          )}
        </main>

        {panelOpen ? (
          <aside className="flex h-[70vh] min-h-0 flex-col rounded-2xl border border-line bg-card p-3 shadow-soft lg:sticky lg:top-4 lg:h-[calc(100vh-11rem)] lg:self-start" aria-label="会議パネル">
            <div className="mb-1 hidden justify-end lg:flex">
              <button type="button" onClick={() => setPanelOpen(false)} className="text-xs text-ink-soft hover:text-ink">
                パネルを閉じる ▸
              </button>
            </div>
            <SidePanel
              m={m}
              utterances={shownUtts}
              tab={tab}
              onTab={setTab}
              focusId={focusId}
              onJump={(uid) => {
                setTab("log");
                setFocusId(undefined);
                setTimeout(() => setFocusId(uid), 30);
              }}
            />
          </aside>
        ) : (
          <button
            type="button"
            onClick={() => setPanelOpen(true)}
            className="fixed right-0 top-1/3 z-20 hidden rounded-l-xl border border-r-0 border-line bg-card px-2 py-4 text-xs shadow-soft [writing-mode:vertical-rl] lg:block"
          >
            ◂ パネルを開く
          </button>
        )}
      </div>

      <ControlBar
        id={id}
        status={st}
        turn={m.turn}
        busy={!!busy}
        speed={speed}
        honne={!!honne}
        onHonne={() => setHonneOverride(!honne)}
        onSpeed={(s) => act.setSpeed(s)}
      />
    </div>
  );
}

function Centered({ children }: { children: React.ReactNode }) {
  return <div className="grid min-h-screen place-items-center px-4 text-center text-ink-soft">{children}</div>;
}

function ControlBar({
  id,
  status,
  turn,
  busy,
  speed,
  honne,
  onHonne,
  onSpeed,
}: {
  id: string;
  status: string;
  turn: number;
  busy: boolean;
  speed: SpeedId;
  honne: boolean;
  onHonne: () => void;
  onSpeed: (s: SpeedId) => void;
}) {
  const act = useMeetingStore.getState();
  const running = status === "running";
  const paused = status === "paused" || status === "error";
  const locked = status === "preparing" || status === "closing" || status === "finished";
  return (
    <div className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-card/95 backdrop-blur">
      <div className="mx-auto flex max-w-[1600px] flex-wrap items-center justify-center gap-x-3 gap-y-2 px-3 py-2.5 sm:justify-between sm:px-5">
        <div className="flex items-center gap-2">
          {running ? (
            <Button variant="primary" onClick={() => act.pause(id)}>
              ⏸ 一時停止
            </Button>
          ) : (
            <Button variant="primary" disabled={locked || status === "error"} onClick={() => act.resume(id)}>
              ▶ {turn === 0 ? "開始" : "再開"}
            </Button>
          )}
          <Button disabled={locked || !paused || busy || status === "error"} onClick={() => act.stepOnce(id)} aria-label="1ターン進める">
            ⏭ <span className="hidden sm:inline">1ターン進める</span>
            <span className="sm:hidden">1ターン</span>
          </Button>
        </div>

        <div className="flex items-center gap-3 text-sm">
          <label className="flex items-center gap-1.5">
            <span className="text-xs text-ink-soft">速度</span>
            <select value={speed} onChange={(e) => onSpeed(e.target.value as SpeedId)} className="rounded-lg border border-line bg-card px-2 py-1.5 text-sm">
              {(Object.keys(SPEEDS) as SpeedId[]).map((k) => (
                <option key={k} value={k}>
                  {SPEEDS[k].label}
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            role="switch"
            aria-checked={honne}
            onClick={onHonne}
            className="flex items-center gap-1.5 rounded-full border border-line bg-card px-2.5 py-1.5 text-sm hover:bg-paper-2"
          >
            <span className={`relative inline-block h-4 w-7 rounded-full transition ${honne ? "bg-gold" : "bg-stone-300"}`}>
              <span className={`absolute top-0.5 h-3 w-3 rounded-full bg-white transition-all ${honne ? "left-3.5" : "left-0.5"}`} />
            </span>
            💭 本音
          </button>
        </div>

        <Button
          variant="danger"
          disabled={locked}
          onClick={() => {
            if (confirm("進行役にまとめに入ってもらい、閉会します。よろしいですか？")) act.requestClose(id);
          }}
        >
          🔔 閉会する
        </Button>
      </div>
    </div>
  );
}
