"use client";

import { useMemo, useRef, useState } from "react";
import type { ModelTier, RoleTemplate, StakeholderGroup, StakeholderSuggestion, UsageTotals } from "@/lib/types";
import { getRole } from "@/data/roles";
import { addCustomRole } from "@/lib/customRoles";
import { Badge, Button, Card } from "@/components/ui";

const GROUPS: { id: StakeholderGroup; label: string }[] = [
  { id: "direct", label: "直接の当事者" },
  { id: "affected", label: "影響を受ける人" },
  { id: "decision_maker", label: "決定権を持つ人" },
  { id: "implementer", label: "実施・運用を担う人" },
  { id: "funder", label: "費用を負担する人" },
  { id: "expert", label: "専門家" },
  { id: "overlooked", label: "見落とされがちな声" },
];
const IMPORTANCE = { high: { label: "重要度 高", tone: "gold" }, medium: { label: "重要度 中", tone: "blue" }, low: { label: "重要度 低", tone: "gray" } } as const;

export interface StakeholderDiscoveryProps {
  topic: string;
  background?: string;
  countryCode: string;
  selectedRoleIds: string[];
  customRoles: RoleTemplate[];
  modelTier: ModelTier;
  onAddRole: (roleId: string, countryCode: string) => void;
  onRoleCreated: (role: RoleTemplate) => void;
  participantCount: number;
  /** The selected meeting type's seat limit. */
  maxParticipants: number;
  /** Reports paid spend (discovery / role creation) so it can be carried into the meeting total. */
  onSpend?: (u: UsageTotals) => void;
}

export default function StakeholderDiscovery(props: StakeholderDiscoveryProps) {
  const { topic, background, countryCode, selectedRoleIds, customRoles, modelTier, onAddRole, onRoleCreated, participantCount, maxParticipants, onSpend } = props;
  const [suggestions, setSuggestions] = useState<StakeholderSuggestion[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [added, setAdded] = useState<Set<string>>(new Set());
  const [creating, setCreating] = useState<Set<string>>(new Set());
  const [bulk, setBulk] = useState(false);
  const [cost, setCost] = useState(0);
  const addedCount = useRef(0);

  const selectedSet = useMemo(() => new Set(selectedRoleIds), [selectedRoleIds]);
  const addCost = (u?: UsageTotals) => {
    if (!u) return;
    setCost((c) => c + (u.estimatedCostUsd ?? 0));
    onSpend?.(u);
  };

  async function discover() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/stakeholders/discover", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic, background, countryCodes: [countryCode], selectedRoleIds, customRoles, modelTier }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "洗い出しに失敗しました");
      setSuggestions(data.suggestions as StakeholderSuggestion[]);
      setAdded(new Set());
      addCost(data.usage);
    } catch (e) {
      setError(e instanceof Error ? e.message : "洗い出しに失敗しました");
    } finally {
      setLoading(false);
    }
  }

  /** Returns true when the suggestion ended up seated. */
  async function addOne(s: StakeholderSuggestion): Promise<boolean> {
    const cc = s.countryCode ?? countryCode;
    if (s.roleId) {
      onAddRole(s.roleId, cc);
      addedCount.current += 1;
      setAdded((a) => new Set(a).add(s.id));
      return true;
    }
    if (!s.newRole) return false;
    setCreating((c) => new Set(c).add(s.id));
    try {
      const res = await fetch("/api/stakeholders/create-role", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...s.newRole, topic, countryCode: cc, modelTier }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "立場の作成に失敗しました");
      const role = data.role as RoleTemplate;
      addCustomRole(role);
      addCost(data.usage);
      onRoleCreated(role);
      onAddRole(role.id, cc);
      addedCount.current += 1;
      setAdded((a) => new Set(a).add(s.id));
      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : "立場の作成に失敗しました");
      return false;
    } finally {
      setCreating((c) => {
        const n = new Set(c);
        n.delete(s.id);
        return n;
      });
    }
  }

  const isDone = (s: StakeholderSuggestion) => added.has(s.id) || (!!s.roleId && selectedSet.has(s.roleId));
  const pendingHigh = (suggestions ?? []).filter((s) => s.importance === "high" && !isDone(s) && !creating.has(s.id));
  const pendingTotal = (suggestions ?? []).filter((s) => !isDone(s)).length;
  const slots = Math.max(0, maxParticipants - participantCount);
  const overLimit = pendingHigh.length > slots;

  async function addAllHigh() {
    // Slots are computed once up front so we never pay to create roles that cannot be seated.
    const batch = pendingHigh.slice(0, slots);
    if (batch.length === 0) return;
    setBulk(true);
    for (const s of batch) await addOne(s);
    setBulk(false);
  }

  return (
    <Card className="p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="font-display text-base font-bold text-ink">この議題に関わる立場を洗い出す</h3>
          <p className="text-xs text-ink-soft">ウェブで調べて、当事者・影響を受ける人・決定する人・見落とされがちな声まで提案します。</p>
        </div>
        <Button variant="gold" onClick={discover} disabled={!topic.trim() || loading || bulk}>
          {loading ? "調べています…" : suggestions ? "もう一度洗い出す" : "関係者を洗い出す"}
        </Button>
      </div>

      {loading && (
        <div className="mt-4 flex items-center gap-3 rounded-xl bg-paper-2 p-4 text-sm text-ink-soft" role="status">
          <Spinner />
          <span>議題に関わる立場を調べています…（1〜2分ほどかかります）</span>
        </div>
      )}
      {error && <p className="mt-3 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800">{error}</p>}

      {suggestions && !loading && (
        <div className="mt-4 space-y-5">
          <div className="flex flex-wrap items-center gap-3">
            <Button variant="primary" size="sm" onClick={addAllHigh} disabled={bulk || slots === 0 || pendingHigh.length === 0}>
              {bulk ? "追加しています…" : slots === 0 ? "席が埋まっています" : `重要度・高をすべて追加（${Math.min(pendingHigh.length, slots)}）`}
            </Button>
            <span className="text-xs text-ink-soft">
              提案 {suggestions.length}件 / 未追加 {pendingTotal}件 / 現在の参加者 {participantCount}人
            </span>
          </div>
          {overLimit && (
            <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
              席が{maxParticipants}人までのため、空き{slots}席分だけ追加します。人数が多いと会議が長く、費用も増えます。
            </p>
          )}
          {GROUPS.map((g) => {
            const items = suggestions.filter((s) => s.group === g.id);
            if (!items.length) return null;
            return (
              <section key={g.id}>
                <h4 className="mb-2 text-sm font-bold text-navy">{g.label}</h4>
                <div className="grid gap-2 md:grid-cols-2">
                  {items.map((s) => {
                    const role = s.roleId ? getRole(s.roleId) : undefined;
                    const title = role?.title ?? s.newRole?.title ?? s.roleId ?? "";
                    const done = isDone(s);
                    const busy = creating.has(s.id);
                    return (
                      <div key={s.id} className={`rounded-xl border p-3 ${done ? "border-emerald-200 bg-emerald-50/50" : "border-line bg-card"}`}>
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="font-bold text-ink">{title}</span>
                          {!s.roleId && <Badge tone="teal">新しい立場</Badge>}
                          <Badge tone={IMPORTANCE[s.importance].tone}>{IMPORTANCE[s.importance].label}</Badge>
                        </div>
                        <p className="mt-1.5 text-sm text-ink">{s.reason}</p>
                        <p className="mt-1 text-xs text-ink-soft">
                          <span className="font-medium">利害：</span>
                          {s.stakes}
                        </p>
                        <div className="mt-2 flex justify-end">
                          {done ? (
                            <span className="text-sm font-medium text-emerald-700">✓ 追加済み</span>
                          ) : (
                            <Button size="sm" variant={s.roleId ? "secondary" : "gold"} disabled={busy || bulk || slots === 0} onClick={() => addOne(s)}>
                              {busy ? (
                                <>
                                  <Spinner small /> 作成中…
                                </>
                              ) : s.roleId ? (
                                "追加"
                              ) : (
                                "作成して追加"
                              )}
                            </Button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            );
          })}
        </div>
      )}
      {cost > 0 && <p className="mt-3 text-right text-[11px] text-ink-faint">この洗い出しの概算費用：約 ${cost.toFixed(2)}</p>}
    </Card>
  );
}

function Spinner({ small = false }: { small?: boolean }) {
  return (
    <span
      aria-hidden
      className={`inline-block animate-spin rounded-full border-2 border-gold border-t-transparent ${small ? "h-3 w-3" : "h-5 w-5"}`}
    />
  );
}
