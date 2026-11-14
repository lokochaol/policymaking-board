"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useMeetingStore } from "@/store/meetingStore";
import { getMeetingType } from "@/data/meetingTypes";
import { Badge, Button, Card, DisclosureBadge } from "@/components/ui";
import { Icon } from "@/components/ui/icons";
import { StorageWarning } from "@/components/ui/StorageWarning";
import { formatDate } from "@/components/ui/labels";
import { meetingStatusStyle } from "@/components/ui/semantic";
import type { MeetingState } from "@/lib/types";

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
      <main className="mx-auto w-full max-w-3xl px-4 pb-24 pt-16 sm:px-6 sm:pt-24">
        <section>
          <p className="flex items-center gap-2 text-xs font-medium tracking-widest text-ink-2">
            <Icon name="users" size={14} /> STAKEHOLDER ROOM
          </p>
          <h1 className="mt-4 text-[28px] font-semibold leading-tight text-ink sm:text-4xl">ステークホルダー会議室</h1>
          <p className="mt-5 max-w-xl text-sm leading-relaxed text-ink-2 sm:text-base">
            生徒も、運転手も、大臣も。社会のさまざまな立場を持つAIが、ひとつの議題を話し合います。
            立場の違いが生む対立と、その先の「落とし所」を、会議室でのぞいてみましょう。
          </p>
          <Link
            href="/setup"
            className="mt-8 inline-flex items-center gap-2 rounded-md border border-ink bg-ink px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-ink/90"
          >
            <Icon name="plus" size={16} /> 新しい会議を開く
          </Link>
        </section>

        <section className="mt-20">
          <h2 className="mb-4 flex items-baseline gap-2 border-b border-line pb-3 text-base font-semibold">
            過去の会議
            {hydrated && list.length > 0 && <span className="text-xs font-normal tabular-nums text-ink-3">{list.length}</span>}
          </h2>
          {!hydrated ? (
            <p className="text-sm text-ink-2">読み込み中…</p>
          ) : list.length === 0 ? (
            <div className="rounded-md border border-dashed border-line px-4 py-12 text-center text-sm text-ink-2">まだ会議はありません。最初の会議を開いてみましょう。</div>
          ) : (
            <ul className="space-y-3">
              {list.map((m) => {
                const t = safeType(m);
                const st = meetingStatusStyle(m.status);
                const href = m.status === "finished" ? `/meeting/${m.config.id}/results` : `/meeting/${m.config.id}`;
                return (
                  <li key={m.config.id}>
                    <Card className="flex items-center gap-3 p-4 transition-colors hover:border-ink-3">
                      <Link href={href} className="min-w-0 flex-1">
                        <p className="truncate font-medium text-ink">{m.config.topic}</p>
                        <p className="mt-1.5 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs text-ink-2">
                          <span>{t?.name ?? m.config.meetingTypeId}</span>
                          <DisclosureBadge level={m.config.disclosure} />
                          <Badge tone={st.tone}>{st.label}</Badge>
                          <span className="tabular-nums">{m.config.participants.length}人</span>
                          <span className="tabular-nums">{formatDate(m.config.createdAt)}</span>
                        </p>
                      </Link>
                      <Button
                        variant="danger"
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
