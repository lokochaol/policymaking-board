"use client";

import type { Participant, RoomTheme } from "@/lib/types";
import { COUNTRIES } from "@/data/countries";
import { getRole } from "@/data/roles";
import Room from "@/components/room/Room";
import { Button, PersonAvatar, SectionTitle } from "@/components/ui";
import { Icon } from "@/components/ui/icons";

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
      <SectionTitle sub={<span className="tabular-nums">{participants.length}人が着席中</span>}>会議室のプレビュー</SectionTitle>
      <div className="relative overflow-hidden rounded-lg border border-line bg-subtle">
        <Room theme={theme} participants={participants} selectedId={selectedId} onSeatClick={(id) => onSelect(id === selectedId ? undefined : id)} className="block h-auto w-full" />
        {participants.length === 0 && (
          <div className="pointer-events-none absolute inset-0 grid place-items-center bg-white/40">
            <p className="rounded-md border border-line bg-white px-4 py-2 text-sm text-ink">参加者を選ぶと、ここに着席します</p>
          </div>
        )}
        {sel && (
          <div className="pop fade-up absolute inset-x-2 bottom-2 z-10 rounded-md border border-line bg-white p-3 sm:inset-x-auto sm:right-3 sm:w-72" role="dialog" aria-label="参加者の情報">
            <div className="flex items-start gap-3">
              <PersonAvatar participant={sel} size={52} />
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium text-ink">
                  {sel.name} <span className="text-xs font-normal tabular-nums text-ink-2">{sel.age}歳</span>
                </p>
                <p className="truncate text-xs text-ink-2">
                  {country?.flag} {country?.name} ／ {role?.title ?? sel.roleId}
                </p>
                {sel.isFacilitator && (
                  <p className="mt-0.5 flex items-center gap-1 text-xs font-medium text-blue-strong">
                    <Icon name="gavel" size={12} /> 進行役（議長席）
                  </p>
                )}
              </div>
              <button type="button" onClick={() => onSelect(undefined)} className="text-ink-3 hover:text-ink" aria-label="閉じる">
                <Icon name="x" size={16} />
              </button>
            </div>
            <p className="mt-2 text-xs leading-relaxed text-ink-2">性格：{sel.personality}</p>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {!sel.isFacilitator && (
                <Button size="sm" onClick={() => onFacilitator(sel.id)}>
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
                className={`flex items-center gap-1.5 rounded-full border py-0.5 pl-0.5 pr-2.5 text-xs transition-colors ${
                  p.id === selectedId ? "border-blue bg-blue-tint text-blue-strong" : "border-line bg-white hover:border-ink-3"
                }`}
              >
                <PersonAvatar participant={p} size={24} />
                <span className="max-w-28 truncate">{p.name}</span>
                {p.isFacilitator && <Icon name="gavel" size={12} className="text-blue" />}
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
