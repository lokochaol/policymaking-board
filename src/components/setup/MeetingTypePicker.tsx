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

const INPUT = "w-full rounded-md border border-line bg-white px-4 py-2.5 text-sm text-ink outline-none placeholder:text-ink-3 focus:border-blue focus:ring-2 focus:ring-blue/15";

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
      <SectionTitle step={2} sub="何について話し合うか">
        議題を決める
      </SectionTitle>
      <label className="block text-xs font-medium text-ink-2" htmlFor="topic">
        議題（必須）<span className="ml-2 font-normal tabular-nums text-ink-3">{topic.length}/120</span>
      </label>
      <input id="topic" value={topic} onChange={(e) => onTopic(e.target.value)} placeholder="例：高校の部活動の地域移行" maxLength={120} className={`mt-1.5 ${INPUT}`} />
      <div className="mt-2.5 flex flex-wrap gap-1.5">
        {TOPIC_EXAMPLES.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => onTopic(t)}
            className="rounded-sm border border-line bg-white px-2.5 py-1 text-xs text-ink-2 transition-colors hover:border-ink-3 hover:text-ink"
          >
            {t}
          </button>
        ))}
      </div>
      <label className="mt-6 block text-xs font-medium text-ink-2" htmlFor="background">
        背景（任意）<span className="ml-2 font-normal tabular-nums text-ink-3">{background.length}/800</span>
      </label>
      <textarea
        id="background"
        value={background}
        onChange={(e) => onBackground(e.target.value)}
        rows={3}
        maxLength={800}
        placeholder="現状・きっかけ・前提条件など。空欄でも進められます。"
        className={`mt-1.5 resize-y ${INPUT}`}
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
              className={`flex flex-col rounded-md border p-4 text-left transition-colors ${active ? "border-blue bg-blue-tint/50 ring-1 ring-blue" : "border-line bg-white hover:border-ink-3"}`}
            >
              <span className="flex flex-wrap items-center gap-2">
                <span className={`text-sm font-semibold ${active ? "text-blue-strong" : "text-ink"}`}>{t.name}</span>
                <DisclosureBadge level={t.disclosure} />
              </span>
              <span className="mt-2 line-clamp-3 text-xs leading-relaxed text-ink-2">{t.description}</span>
              <span className="mt-auto flex flex-wrap gap-x-3 gap-y-0.5 pt-3 text-[11px] text-ink-2">
                <span>合意：{DECISION_RULE_LABELS[t.decisionRule].label}</span>
                <span>成果物：{t.outputTitle}</span>
                <span className="tabular-nums">
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
