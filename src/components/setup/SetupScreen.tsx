"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { DecisionRule, DisclosureLevel, MeetingConfig, MeetingTypeId, ModelTier, Participant } from "@/lib/types";
import { MEETING_TYPES, getMeetingType } from "@/data/meetingTypes";
import { COUNTRIES } from "@/data/countries";
import { createParticipant, rerollParticipant } from "@/lib/participants";
import { newId, useMeetingStore } from "@/store/meetingStore";
import { Button } from "@/components/ui";
import { RolePicker } from "./RolePicker";
import { RoomPreview } from "./RoomPreview";
import { MeetingTypePicker, TopicInput } from "./MeetingTypePicker";
import { AdvancedSettings } from "./AdvancedSettings";
import type { Preset } from "./presets";

const seedOf = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

/** Facilitator takes the chair (seat 0); seats are renumbered in order. */
function arrange(list: Participant[]): Participant[] {
  const fac = list.filter((p) => p.isFacilitator);
  const rest = list.filter((p) => !p.isFacilitator);
  return [...fac, ...rest].map((p, i) => ({ ...p, seatIndex: i }));
}

export function SetupScreen() {
  const router = useRouter();
  const createMeeting = useMeetingStore((s) => s.createMeeting);

  const [countryCode, setCountryCode] = useState(COUNTRIES[0]?.code ?? "JP");
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [selectedId, setSelectedId] = useState<string>();
  const [topic, setTopic] = useState("");
  const [background, setBackground] = useState("");
  const [typeId, setTypeId] = useState<MeetingTypeId>(MEETING_TYPES[0].id);
  const type = getMeetingType(typeId);
  const [disclosure, setDisclosure] = useState<DisclosureLevel>(type.disclosure);
  const [decisionRule, setDecisionRule] = useState<DecisionRule>(type.decisionRule);
  const [lengthFactor, setLengthFactor] = useState(1);
  const [modelTier, setModelTier] = useState<ModelTier>("standard");

  useEffect(() => {
    useMeetingStore.getState().hydrate();
  }, []);

  const pickType = (id: MeetingTypeId) => {
    const t = getMeetingType(id);
    setTypeId(id);
    setDisclosure(t.disclosure);
    setDecisionRule(t.decisionRule);
  };

  const add = useCallback(
    (roleId: string) => {
      setParticipants((prev) => {
        if (prev.length >= type.maxParticipants) return prev;
        const p = createParticipant(roleId, countryCode, seedOf(), prev.length);
        const withFac = prev.some((x) => x.isFacilitator) ? { ...p, isFacilitator: false } : { ...p, isFacilitator: true };
        return arrange([...prev, withFac]);
      });
    },
    [countryCode, type.maxParticipants],
  );

  const applyPreset = (preset: Preset) => {
    const facRole = preset.facilitatorRoleId && preset.roleIds.includes(preset.facilitatorRoleId) ? preset.facilitatorRoleId : preset.roleIds[0];
    const list = preset.roleIds.slice(0, type.maxParticipants).map((rid, i) => {
      const p = createParticipant(rid, countryCode, seedOf() + i, i);
      return { ...p, isFacilitator: rid === facRole };
    });
    setParticipants(arrange(list));
    setTopic(preset.topic);
    setSelectedId(undefined);
    pickType(preset.meetingTypeId);
  };

  const setFacilitator = (id: string) => setParticipants((prev) => arrange(prev.map((p) => ({ ...p, isFacilitator: p.id === id }))));
  const reroll = (id: string) => setParticipants((prev) => prev.map((p) => (p.id === id ? { ...rerollParticipant(p, seedOf()), isFacilitator: p.isFacilitator, seatIndex: p.seatIndex } : p)));
  const remove = (id: string) => {
    setParticipants((prev) => arrange(prev.filter((p) => p.id !== id)));
    setSelectedId(undefined);
  };

  const roleCounts = useMemo(() => {
    const c: Record<string, number> = {};
    participants.forEach((p) => (c[p.roleId] = (c[p.roleId] ?? 0) + 1));
    return c;
  }, [participants]);

  const facilitator = participants.find((p) => p.isFacilitator);
  const problems: string[] = [];
  if (participants.length < 2) problems.push("参加者を2人以上選んでください");
  if (participants.length >= 2 && !facilitator) problems.push("進行役を任命してください（会議室の席をクリック）");
  if (!topic.trim()) problems.push("議題を入力してください");
  const notes: string[] = [];
  if (participants.length >= 2 && participants.length < type.minParticipants) notes.push(`この会議の種類は${type.minParticipants}人以上が推奨です`);

  const start = () => {
    if (problems.length || !facilitator) return;
    const config: MeetingConfig = {
      id: newId(),
      createdAt: new Date().toISOString(),
      topic: topic.trim(),
      background: background.trim() || undefined,
      meetingTypeId: typeId,
      disclosure,
      decisionRule,
      participants,
      facilitatorId: facilitator.id,
      modelTier,
      lengthFactor,
      customRoles: [],
    };
    const id = createMeeting(config);
    router.push(`/meeting/${id}`);
  };

  return (
    <div className="mx-auto w-full max-w-7xl px-4 pb-32 pt-5 sm:px-6">
      <header className="mb-5 flex items-center justify-between">
        <Link href="/" className="text-sm text-ink-soft hover:text-ink">
          ← ホーム
        </Link>
        <h1 className="font-display text-xl font-bold text-navy sm:text-2xl">新しい会議を開く</h1>
        <span className="w-12" />
      </header>

      <div className="grid gap-6 lg:grid-cols-[2fr_3fr]">
        <RolePicker
          countryCode={countryCode}
          onCountry={setCountryCode}
          roleCounts={roleCounts}
          canAdd={participants.length < type.maxParticipants}
          onAdd={add}
          onPreset={applyPreset}
        />
        <div className="lg:sticky lg:top-4 lg:self-start">
          <RoomPreview
            theme={type.roomTheme}
            participants={participants}
            selectedId={selectedId}
            onSelect={setSelectedId}
            onFacilitator={setFacilitator}
            onReroll={reroll}
            onRemove={remove}
          />
        </div>
      </div>

      <div className="mt-8 space-y-8 border-t border-line pt-8">
        <TopicInput topic={topic} background={background} onTopic={setTopic} onBackground={setBackground} />
        {/* 将来: 「関係者を洗い出す」パネル（docs §3.1c）をここに追加する */}
        <MeetingTypePicker value={typeId} onChange={pickType} />
        <AdvancedSettings
          type={type}
          participantCount={participants.length}
          disclosure={disclosure}
          decisionRule={decisionRule}
          lengthFactor={lengthFactor}
          modelTier={modelTier}
          onDisclosure={setDisclosure}
          onDecisionRule={setDecisionRule}
          onLength={setLengthFactor}
          onTier={setModelTier}
        />
      </div>

      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-paper/95 px-4 py-3 backdrop-blur">
        <div className="mx-auto flex max-w-7xl flex-col items-stretch gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0 text-xs text-ink-soft" aria-live="polite">
            {problems.length > 0 ? (
              <span className="text-amber-700">{problems.join(" ／ ")}</span>
            ) : (
              <span>
                {participants.length}人・{type.name}・{topic.trim()}
                {notes.length > 0 && <span className="ml-2 text-amber-700">{notes.join(" ／ ")}</span>}
              </span>
            )}
          </div>
          <Button variant="gold" size="lg" disabled={problems.length > 0} onClick={start} className="sm:min-w-52">
            🔔 開会する
          </Button>
        </div>
      </div>
    </div>
  );
}
