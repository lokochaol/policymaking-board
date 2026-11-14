"use client";

import type { MeetingTypeId } from "@/lib/types";
import { DECISION_RULE_LABELS, MEETING_TYPES } from "@/data/meetingTypes";
import { DisclosureBadge, SectionTitle } from "@/components/ui";

export const TOPIC_EXAMPLES = [
  "高校の部活動の地域移行",
  "ライドシェアの全面解禁",
  "生成AIの学校での利用ルール",
  "地方の公共交通の維持",
  "週休3日制の導入",
  "空き家の活用と地域再生",
];

export function TopicInput({
  topic,
  background,
  onTopic,
  onBackground,
}: {
  topic: string;
  background: string;
  onTopic: (v: string) => void;
  onBackground: (v: string) => void;
}) {
  return (
    <section>
      <SectionTitle step={2}>議題を決める</SectionTitle>
      <label className="block text-xs font-medium text-ink-soft" htmlFor="topic">
        議題（必須）<span className="ml-2 text-ink-faint">{topic.length}/120</span>
      </label>
      <input
        id="topic"
        value={topic}
        onChange={(e) => onTopic(e.target.value)}
        placeholder="例：高校の部活動の地域移行"
        maxLength={120}
        className="mt-1 w-full rounded-xl border border-line bg-card px-4 py-3 text-base outline-none placeholder:text-ink-faint focus:border-gold focus:ring-2 focus:ring-gold/20"
      />
      <div className="mt-2 flex flex-wrap gap-1.5">
        {TOPIC_EXAMPLES.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => onTopic(t)}
            className="rounded-full border border-line bg-card px-3 py-1 text-xs text-ink-soft transition hover:border-gold hover:text-ink"
          >
            {t}
          </button>
        ))}
      </div>
      <label className="mt-4 block text-xs font-medium text-ink-soft" htmlFor="background">
        背景（任意）<span className="ml-2 text-ink-faint">{background.length}/800</span>
      </label>
      <textarea
        id="background"
        value={background}
        onChange={(e) => onBackground(e.target.value)}
        rows={3}
        maxLength={800}
        placeholder="現状・きっかけ・前提条件など。空欄でも進められます。"
        className="mt-1 w-full resize-y rounded-xl border border-line bg-card px-4 py-3 text-sm outline-none placeholder:text-ink-faint focus:border-gold focus:ring-2 focus:ring-gold/20"
      />
    </section>
  );
}

export function MeetingTypePicker({ value, onChange }: { value: MeetingTypeId; onChange: (id: MeetingTypeId) => void }) {
  return (
    <section>
      <SectionTitle step={3} sub="選ぶと会議室の内装が変わります">
        会議の種類
      </SectionTitle>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {MEETING_TYPES.map((t) => {
          const active = t.id === value;
          return (
            <button
              key={t.id}
              type="button"
              aria-pressed={active}
              onClick={() => onChange(t.id)}
              className={`flex flex-col rounded-2xl border p-4 text-left transition ${
                active ? "border-gold bg-gold-soft/50 shadow-lift ring-2 ring-gold/40" : "border-line bg-card hover:-translate-y-px hover:border-gold/60 hover:shadow-soft"
              }`}
            >
              <span className="flex flex-wrap items-center gap-2">
                <span className="font-display text-base font-bold text-navy">{t.name}</span>
                <DisclosureBadge level={t.disclosure} />
              </span>
              <span className="mt-1.5 line-clamp-3 text-xs leading-relaxed text-ink-soft">{t.description}</span>
              <span className="mt-auto flex flex-wrap gap-x-3 gap-y-0.5 pt-3 text-[11px] text-ink-soft">
                <span>合意：{DECISION_RULE_LABELS[t.decisionRule].label}</span>
                <span>成果物：{t.outputTitle}</span>
                <span>
                  {t.minParticipants}〜{t.maxParticipants}人
                </span>
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
