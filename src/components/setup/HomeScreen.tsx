"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useMeetingStore } from "@/store/meetingStore";
import { getMeetingType } from "@/data/meetingTypes";
import { Badge, Button, Card, DisclosureBadge } from "@/components/ui";
import { StorageWarning } from "@/components/ui/StorageWarning";
import { formatDate } from "@/components/ui/labels";
import type { MeetingState, MeetingStatus } from "@/lib/types";

const STATUS: Record<MeetingStatus, { label: string; tone: "gray" | "blue" | "green" | "amber" | "red" }> = {
  setup: { label: "準備中", tone: "gray" },
  preparing: { label: "事前調査", tone: "blue" },
  running: { label: "進行中", tone: "blue" },
  paused: { label: "一時停止", tone: "amber" },
  closing: { label: "閉会処理中", tone: "blue" },
  finished: { label: "終了", tone: "green" },
  error: { label: "エラー", tone: "red" },
};

function safeType(m: MeetingState) {
  try {
    return getMeetingType(m.config.meetingTypeId);
  } catch {
    return undefined;
  }
}

export function HomeScreen() {
  const hydrated = useMeetingStore((s) => s.hydrated);
  const meetings = useMeetingStore((s) => s.meetings);
  const deleteMeeting = useMeetingStore((s) => s.deleteMeeting);
  useEffect(() => {
    useMeetingStore.getState().hydrate();
  }, []);
  const list = Object.values(meetings).sort((a, b) => b.config.createdAt.localeCompare(a.config.createdAt));

  return (
    <>
    <StorageWarning />
    <main className="mx-auto w-full max-w-4xl px-4 pb-20 pt-10 sm:px-6 sm:pt-16">
      <section className="text-center">
        <p className="text-xs tracking-[0.3em] text-gold-dark">STAKEHOLDER ROOM</p>
        <h1 className="font-display mt-3 text-3xl font-bold leading-tight text-navy sm:text-5xl">ステークホルダー会議室</h1>
        <p className="mx-auto mt-4 max-w-xl text-sm leading-relaxed text-ink-soft sm:text-base">
          生徒も、運転手も、大臣も。社会のさまざまな立場を持つAIが、ひとつの議題を話し合います。
          立場の違いが生む対立と、その先の「落とし所」を、会議室でのぞいてみましょう。
        </p>
        <Link href="/setup" className="mt-8 inline-flex items-center gap-2 rounded-full bg-navy px-8 py-3.5 font-medium text-white shadow-lift transition hover:bg-navy-dark">
          <span aria-hidden>🔔</span> 新しい会議を開く
        </Link>
      </section>

      <section className="mt-14">
        <h2 className="font-display mb-3 text-lg font-bold">過去の会議</h2>
        {!hydrated ? (
          <p className="text-sm text-ink-soft">読み込み中…</p>
        ) : list.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-line px-4 py-10 text-center text-sm text-ink-soft">まだ会議はありません。最初の会議を開いてみましょう。</div>
        ) : (
          <ul className="space-y-3">
            {list.map((m) => {
              const t = safeType(m);
              const st = STATUS[m.status];
              const href = m.status === "finished" ? `/meeting/${m.config.id}/results` : `/meeting/${m.config.id}`;
              return (
                <li key={m.config.id}>
                  <Card className="flex items-center gap-3 p-4 transition hover:shadow-lift">
                    <Link href={href} className="min-w-0 flex-1">
                      <p className="truncate font-bold text-ink">{m.config.topic}</p>
                      <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-ink-soft">
                        <span>{t?.name ?? m.config.meetingTypeId}</span>
                        <DisclosureBadge level={m.config.disclosure} />
                        <Badge tone={st.tone}>{st.label}</Badge>
                        <span>{m.config.participants.length}人</span>
                        <span>{formatDate(m.config.createdAt)}</span>
                      </p>
                    </Link>
                    <Button
                      variant="ghost"
                      size="sm"
                      aria-label="この会議を削除"
                      onClick={() => {
                        if (confirm("この会議の記録を削除しますか？")) deleteMeeting(m.config.id);
                      }}
                    >
                      削除
                    </Button>
                  </Card>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </main>
    </>
  );
}
