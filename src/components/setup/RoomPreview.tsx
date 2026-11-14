"use client";

import type { Participant, RoomTheme } from "@/lib/types";
import { COUNTRIES } from "@/data/countries";
import { getRole } from "@/data/roles";
import { Room } from "@/components/room/Room";
import { Button, PersonAvatar, SectionTitle } from "@/components/ui";

export function RoomPreview({
  theme,
  participants,
  selectedId,
  onSelect,
  onFacilitator,
  onReroll,
  onRemove,
}: {
  theme: RoomTheme;
  participants: Participant[];
  selectedId?: string;
  onSelect: (id: string | undefined) => void;
  onFacilitator: (id: string) => void;
  onReroll: (id: string) => void;
  onRemove: (id: string) => void;
}) {
  const sel = participants.find((p) => p.id === selectedId);
  const country = sel ? COUNTRIES.find((c) => c.code === sel.countryCode) : undefined;
  const role = sel ? getRole(sel.roleId) : undefined;

  return (
    <section>
      <SectionTitle sub={`${participants.length}人が着席中`}>会議室のプレビュー</SectionTitle>
      <div className="relative overflow-hidden rounded-2xl border border-line bg-navy-dark shadow-lift">
        <Room theme={theme} participants={participants} selectedId={selectedId} onSeatClick={(id) => onSelect(id === selectedId ? undefined : id)} className="block h-auto w-full" />
        {participants.length === 0 && (
          <div className="pointer-events-none absolute inset-0 grid place-items-center bg-navy-dark/45">
            <p className="rounded-full bg-card/95 px-4 py-2 text-sm font-medium text-ink shadow-soft">参加者を選ぶと、ここに着席します</p>
          </div>
        )}
        {sel && (
          <div className="fade-up absolute inset-x-2 bottom-2 z-10 rounded-xl border border-line bg-card/97 p-3 shadow-lift sm:inset-x-auto sm:right-3 sm:w-72" role="dialog" aria-label="参加者の情報">
            <div className="flex items-start gap-3">
              <PersonAvatar participant={sel} size={52} />
              <div className="min-w-0 flex-1">
                <p className="truncate font-bold text-ink">
                  {sel.name} <span className="text-xs font-normal text-ink-soft">{sel.age}歳</span>
                </p>
                <p className="truncate text-xs text-ink-soft">
                  {country?.flag} {country?.name} ／ {role?.title ?? sel.roleId}
                </p>
                {sel.isFacilitator && <p className="text-xs font-medium text-gold-dark">🔨 進行役（議長席）</p>}
              </div>
              <button type="button" onClick={() => onSelect(undefined)} className="text-ink-faint hover:text-ink" aria-label="閉じる">
                ✕
              </button>
            </div>
            <p className="mt-2 text-xs leading-relaxed text-ink-soft">性格：{sel.personality}</p>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {!sel.isFacilitator && (
                <Button size="sm" variant="gold" onClick={() => onFacilitator(sel.id)}>
                  進行役に任命
                </Button>
              )}
              <Button size="sm" onClick={() => onReroll(sel.id)}>
                名前を振り直す
              </Button>
              <Button size="sm" variant="danger" onClick={() => onRemove(sel.id)}>
                退席させる
              </Button>
            </div>
          </div>
        )}
      </div>

      {participants.length > 0 && (
        <ul className="mt-3 flex flex-wrap gap-1.5" aria-label="参加者一覧">
          {participants.map((p) => (
            <li key={p.id}>
              <button
                type="button"
                onClick={() => onSelect(p.id === selectedId ? undefined : p.id)}
                className={`flex items-center gap-1.5 rounded-full border py-0.5 pl-0.5 pr-2.5 text-xs transition ${
                  p.id === selectedId ? "border-gold bg-gold-soft" : "border-line bg-card hover:bg-paper-2"
                }`}
              >
                <PersonAvatar participant={p} size={24} />
                <span className="max-w-28 truncate">{p.name}</span>
                {p.isFacilitator && <span title="進行役">🔨</span>}
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
