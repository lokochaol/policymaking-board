"use client";

import { memo, useMemo, useState } from "react";
import type { Participant, RoleCategory, RoleTemplate } from "@/lib/types";
import { COUNTRIES } from "@/data/countries";
import { CATEGORY_LABELS, ROLES } from "@/data/roles";
import { createParticipant } from "@/lib/participants";
import { PersonAvatar, SectionTitle, Tabs } from "@/components/ui";
import { Icon } from "@/components/ui/icons";
import { resolvePresets, type Preset } from "./presets";

const RoleCard = memo(function RoleCard({
  role,
  countryCode,
  count,
  disabled,
  onAdd,
}: {
  role: RoleTemplate;
  countryCode: string;
  count: number;
  disabled: boolean;
  onAdd: (roleId: string) => void;
}) {
  const preview: Participant = useMemo(() => createParticipant(role.id, countryCode, `preview-${role.id}`, 0), [role.id, countryCode]);
  return (
    <button
      type="button"
      onClick={() => onAdd(role.id)}
      disabled={disabled}
      aria-label={`${role.title}を追加`}
      className={`group relative flex w-full items-center gap-3 rounded-md border p-2.5 text-left transition-colors disabled:opacity-50 disabled:hover:border-line ${count > 0 ? "border-blue/40 bg-blue-tint/40" : "border-line bg-white hover:border-ink-3"}`}
    >
      <PersonAvatar participant={preview} size={44} />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-medium text-ink">
          {role.title}
          {role.id.startsWith("custom_") && <span className="ml-1.5 rounded-sm border border-line bg-subtle px-1 text-[10px] font-medium text-ink-2">作成</span>}
        </span>
        <span className="line-clamp-2 text-xs leading-snug text-ink-2">{role.description}</span>
      </span>
      {count > 0 ? (
        <span className="grid h-6 min-w-6 shrink-0 place-items-center rounded-full bg-blue-tint px-1.5 text-xs font-semibold tabular-nums text-blue-strong ring-1 ring-blue/40">{count}</span>
      ) : (
        <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full border border-line text-ink-2 group-hover:border-blue group-hover:text-blue"><Icon name="plus" size={14} /></span>
      )}
    </button>
  );
});

export function RolePicker({
  countryCode,
  onCountry,
  customRoles,
  roleCounts,
  canAdd,
  onAdd,
  onPreset,
}: {
  countryCode: string;
  onCountry: (c: string) => void;
  customRoles: RoleTemplate[];
  roleCounts: Record<string, number>;
  canAdd: boolean;
  onAdd: (roleId: string) => void;
  onPreset: (p: Preset) => void;
}) {
  const [cat, setCat] = useState<RoleCategory | "all" | "custom">("all");
  const [q, setQ] = useState("");
  const presets = useMemo(() => resolvePresets(), []);

  const cats = useMemo(() => {
    const present = new Set(ROLES.map((r) => r.category));
    return (Object.keys(CATEGORY_LABELS) as RoleCategory[]).filter((c) => present.has(c));
  }, []);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    const all = [...customRoles, ...ROLES];
    return all.filter((r) => (cat === "all" || (cat === "custom" ? r.id.startsWith("custom_") : r.category === cat)) && (!s || `${r.title}${r.shortTitle}${r.description}`.toLowerCase().includes(s)));
  }, [cat, q, customRoles]);

  return (
    <section>
      <SectionTitle step={1} sub="クリックで着席します">
        参加者を選ぶ
      </SectionTitle>

      {presets.length > 0 && (
        <div className="mb-3">
          <p className="mb-2 text-xs font-medium text-ink-2">おすすめの組み合わせ</p>
          <div className="scroll-thin -mx-1 flex gap-2 overflow-x-auto px-1 pb-2">
            {presets.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => onPreset(p)}
                className="w-44 shrink-0 rounded-md border border-line bg-white p-3 text-left transition-colors hover:border-ink-3 hover:bg-subtle"
              >
                <span className="block text-sm font-medium text-ink">{p.name}</span>
                <span className="line-clamp-2 text-[11px] leading-snug text-ink-2">{p.description}</span>
                <span className="mt-1.5 block text-[11px] tabular-nums text-ink-3">{p.roleIds.length}人</span>
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="mb-3 grid gap-2 sm:grid-cols-[auto_1fr]">
        <label className="flex items-center gap-2 rounded-md border border-line bg-white px-3 py-2 text-sm">
          <span className="shrink-0 text-xs text-ink-2">国</span>
          <select
            value={countryCode}
            onChange={(e) => onCountry(e.target.value)}
            className="min-w-0 flex-1 bg-transparent font-medium outline-none"
            aria-label="国を選ぶ"
          >
            {COUNTRIES.map((c) => (
              <option key={c.code} value={c.code}>
                {c.flag} {c.name}
              </option>
            ))}
          </select>
        </label>
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="役割を検索（例：教師、市長）"
          aria-label="役割を検索"
          className="min-w-0 rounded-md border border-line bg-white px-3 py-2 text-sm outline-none placeholder:text-ink-3 focus:border-blue focus:ring-2 focus:ring-blue/15"
        />
      </div>

      <Tabs
        variant="pill"
        className="mb-3 pb-1"
        value={cat}
        onChange={setCat}
        tabs={[{ id: "all" as const, label: "すべて" }, ...(customRoles.length ? [{ id: "custom" as const, label: `作成した立場 (${customRoles.length})` }] : []), ...cats.map((c) => ({ id: c, label: CATEGORY_LABELS[c] }))]}
      />

      <div className="scroll-thin grid max-h-[420px] gap-2 overflow-y-auto pr-1 sm:grid-cols-2 lg:max-h-[520px] lg:grid-cols-1">
        {filtered.map((r) => (
          <RoleCard key={r.id} role={r} countryCode={countryCode} count={roleCounts[r.id] ?? 0} disabled={!canAdd} onAdd={onAdd} />
        ))}
        {filtered.length === 0 && <p className="col-span-full py-6 text-center text-sm text-ink-2">該当する役割がありません。</p>}
      </div>
      {!canAdd && <p className="mt-2 flex items-center gap-1.5 text-xs text-ink"><Icon name="alert" size={14} className="text-yellow-strong" />この会議の種類の上限人数に達しています。</p>}
    </section>
  );
}
