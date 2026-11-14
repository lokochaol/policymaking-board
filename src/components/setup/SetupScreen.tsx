"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { UsageTotals, DecisionRule, DisclosureLevel, MeetingConfig, MeetingTypeId, ModelTier, Participant, RoleTemplate } from "@/lib/types";
import { loadCustomRoles } from "@/lib/customRoles";
import StakeholderDiscovery from "./StakeholderDiscovery";
import { MEETING_TYPES, defaultDurationMinutes, getMeetingType } from "@/data/meetingTypes";
import { COUNTRIES } from "@/data/countries";
import { createParticipant, rerollParticipant } from "@/lib/participants";
import { emptyUsage, newId, useMeetingStore } from "@/store/meetingStore";
import { Button } from "@/components/ui";
import { Icon } from "@/components/ui/icons";
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
  const [durationMinutes, setDurationMinutes] = useState(defaultDurationMinutes[MEETING_TYPES[0].id]);
  const [modelTier, setModelTier] = useState<ModelTier>("standard");

  const [customRoles, setCustomRoles] = useState<RoleTemplate[]>([]);
  /** Spend from discovery / create-role calls, carried into the meeting's total. */
  const spend = useRef<UsageTotals>(emptyUsage());
  const onSpend = useCallback((u: UsageTotals) => {
    const t = spend.current;
    spend.current = {
      inputTokens: t.inputTokens + (u.inputTokens ?? 0),
      outputTokens: t.outputTokens + (u.outputTokens ?? 0),
      cacheReadTokens: t.cacheReadTokens + (u.cacheReadTokens ?? 0),
      estimatedCostUsd: t.estimatedCostUsd + (u.estimatedCostUsd ?? 0),
    };
  }, []);

  useEffect(() => {
    useMeetingStore.getState().hydrate();
    setCustomRoles(loadCustomRoles());
  }, []);

  const pickType = (id: MeetingTypeId) => {
    const t = getMeetingType(id);
    setTypeId(id);
    setDisclosure(t.disclosure);
    setDecisionRule(t.decisionRule);
    setDurationMinutes(defaultDurationMinutes[id]);
  };

  const addParticipant = useCallback(
    (roleId: string, cc: string) => {
      setParticipants((prev) => {
        if (prev.length >= type.maxParticipants) return prev;
        const p = createParticipant(roleId, cc, seedOf(), prev.length);
        const withFac = prev.some((x) => x.isFacilitator) ? { ...p, isFacilitator: false } : { ...p, isFacilitator: true };
        return arrange([...prev, withFac]);
      });
    },
    [type.maxParticipants],
  );
  const add = useCallback((roleId: string) => addParticipant(roleId, countryCode), [addParticipant, countryCode]);

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
  if (participants.length > Math.min(type.maxParticipants, 16)) problems.push(`この会議の種類は${Math.min(type.maxParticipants, 16)}人までです。参加者を減らしてください`);
  if (!topic.trim()) problems.push("議題を入力してください");
  if (topic.trim().length > 500) problems.push("議題は500字以内にしてください");
  if (background.trim().length > 3000) problems.push("背景は3000字以内にしてください");
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
      durationMinutes,
      customRoles: customRoles.filter((r) => participants.some((p) => p.roleId === r.id)).slice(0, 20),
    };
    const id = createMeeting(config, spend.current);
    router.push(`/meeting/${id}`);
  };

  const step1Done = participants.length >= 2 && !!facilitator;
  const step2Done = !!topic.trim();
  const steps = [
    { n: 1, id: "step-1", label: "参加者を選ぶ", done: step1Done },
    { n: 2, id: "step-2", label: "議題を決める", done: step2Done },
    { n: 3, id: "step-3", label: "会議の種類", done: step1Done && step2Done },
  ];
  const currentStep = steps.find((x) => !x.done)?.n;

  return (
    <div className="mx-auto w-full max-w-7xl px-4 pb-32 pt-6 sm:px-6">
      <header className="mb-8">
        <Link href="/" className="inline-flex items-center gap-1.5 text-sm text-ink-2 hover:text-ink">
          <Icon name="arrow-left" size={14} /> ホーム
        </Link>
        <h1 className="mt-4 text-2xl font-semibold text-ink">新しい会議を開く</h1>
        <ol className="mt-5 flex flex-wrap items-center gap-x-2 gap-y-2" aria-label="手順">
          {steps.map((st, i) => {
            const current = st.n === currentStep;
            const cls = current ? "border-blue bg-blue-tint text-blue-strong" : st.done ? "border-line bg-white text-ink-2" : "border-line bg-white text-ink-3";
            return (
              <li key={st.n} className="flex items-center gap-2">
                <a href={`#${st.id}`} aria-current={current ? "step" : undefined} className={`flex items-center gap-2 rounded-md border px-3 py-1.5 text-sm transition-colors hover:border-ink-3 ${cls}`}>
                  <span className={`grid h-5 w-5 place-items-center rounded-full text-[11px] font-semibold tabular-nums ${current ? "bg-blue text-white" : "border border-current"}`}>
                    {st.done && !current ? <Icon name="check" size={12} /> : st.n}
                  </span>
                  <span className={current ? "font-medium" : ""}>{st.label}</span>
                </a>
                {i < steps.length - 1 && <span className="hidden h-px w-6 bg-line sm:block" />}
              </li>
            );
          })}
        </ol>
      </header>

      <div id="step-1" className="grid scroll-mt-4 grid-cols-[minmax(0,1fr)] gap-8 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
        <RolePicker
          countryCode={countryCode}
          onCountry={setCountryCode}
          customRoles={customRoles}
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

      <div className="mt-12 space-y-12 border-t border-line pt-12">
        <div id="step-2" className="scroll-mt-4 space-y-6">
          <TopicInput topic={topic} background={background} onTopic={setTopic} onBackground={setBackground} />
          <StakeholderDiscovery
            topic={topic}
            background={background}
            countryCode={countryCode}
            selectedRoleIds={participants.map((p) => p.roleId)}
            customRoles={customRoles}
            modelTier={modelTier}
            participantCount={participants.length}
            maxParticipants={type.maxParticipants}
            onSpend={onSpend}
            onRoleCreated={(role) => setCustomRoles((prev) => (prev.some((r) => r.id === role.id) ? prev : [...prev, role]))}
            onAddRole={(roleId, cc) => addParticipant(roleId, cc)}
          />
        </div>
        <div id="step-3" className="scroll-mt-4 space-y-6 border-t border-line pt-12">
          <MeetingTypePicker value={typeId} onChange={pickType} />
          <AdvancedSettings
            type={type}
            participantCount={participants.length}
            disclosure={disclosure}
            decisionRule={decisionRule}
            durationMinutes={durationMinutes}
            modelTier={modelTier}
            onDisclosure={setDisclosure}
            onDecisionRule={setDecisionRule}
            onDuration={setDurationMinutes}
            onTier={setModelTier}
          />
        </div>
      </div>

      <div className="pop fixed inset-x-0 bottom-0 z-30 border-t border-line bg-white/95 px-4 py-3 backdrop-blur">
        <div className="mx-auto flex max-w-7xl flex-col items-stretch gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0 text-xs text-ink-2" aria-live="polite">
            {problems.length > 0 ? (
              <span className="flex items-center gap-1.5 text-ink">
                <Icon name="alert" size={14} className="shrink-0 text-yellow-strong" />
                {problems.join(" ／ ")}
              </span>
            ) : (
              <span>
                <span className="tabular-nums">{participants.length}</span>人・{type.name}・{topic.trim()}
                {notes.length > 0 && <span className="ml-2 text-yellow-strong">{notes.join(" ／ ")}</span>}
              </span>
            )}
          </div>
          <Button variant="primary" size="lg" disabled={problems.length > 0} onClick={start} className="sm:min-w-48">
            <Icon name="play" size={14} /> 開会する
          </Button>
        </div>
      </div>
    </div>
  );
}
