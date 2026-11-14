"use client";

import type { ReactNode, ButtonHTMLAttributes } from "react";
import type { DisclosureLevel, Participant, Stance } from "@/lib/types";
import { DISCLOSURE_LABELS } from "@/data/meetingTypes";
import Avatar from "@/components/room/Avatar";
import type { Expression } from "@/components/room/types";
import { STANCE_COLOR, STANCE_LABEL, type Tone } from "./labels";

const TONES: Record<Tone, string> = {
  navy: "bg-navy text-white",
  gold: "bg-gold-soft text-gold-dark border border-gold/30",
  green: "bg-emerald-50 text-emerald-800 border border-emerald-200",
  red: "bg-rose-50 text-rose-800 border border-rose-200",
  amber: "bg-amber-50 text-amber-800 border border-amber-200",
  gray: "bg-stone-100 text-stone-600 border border-stone-200",
  blue: "bg-sky-50 text-sky-800 border border-sky-200",
  teal: "bg-teal-50 text-teal-800 border border-teal-200",
  rose: "bg-fuchsia-50 text-fuchsia-800 border border-fuchsia-200",
};

export function Badge({ tone = "gray", children, className = "" }: { tone?: Tone; children: ReactNode; className?: string }) {
  return (
    <span className={`inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium ${TONES[tone]} ${className}`}>
      {children}
    </span>
  );
}

const DISCLOSURE_TONE: Record<DisclosureLevel, Tone> = { public: "blue", closed: "gray", chatham: "teal", offrecord: "rose" };
const DISCLOSURE_ICON: Record<DisclosureLevel, string> = { public: "📢", closed: "🔒", chatham: "🏛", offrecord: "🤫" };

export function DisclosureBadge({ level }: { level: DisclosureLevel }) {
  return (
    <Badge tone={DISCLOSURE_TONE[level]}>
      <span aria-hidden>{DISCLOSURE_ICON[level]}</span>
      {DISCLOSURE_LABELS[level].label}
    </Badge>
  );
}

export function Card({ children, className = "", as: Tag = "div" }: { children: ReactNode; className?: string; as?: "div" | "section" | "article" }) {
  return <Tag className={`rounded-2xl border border-line bg-card shadow-soft ${className}`}>{children}</Tag>;
}

export function SectionTitle({ children, sub, step }: { children: ReactNode; sub?: ReactNode; step?: number }) {
  return (
    <div className="mb-3 flex items-baseline gap-2">
      {step !== undefined && (
        <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-navy text-xs font-bold text-white">{step}</span>
      )}
      <h2 className="font-display text-lg font-bold text-ink">{children}</h2>
      {sub && <span className="text-xs text-ink-soft">{sub}</span>}
    </div>
  );
}

type BtnVariant = "primary" | "gold" | "secondary" | "ghost" | "danger";
const BTN: Record<BtnVariant, string> = {
  primary: "bg-navy text-white hover:bg-navy-dark shadow-soft disabled:bg-stone-300 disabled:shadow-none",
  gold: "bg-gold text-white hover:bg-gold-dark shadow-soft disabled:bg-stone-300 disabled:shadow-none",
  secondary: "bg-card text-ink border border-line hover:bg-paper-2 disabled:text-ink-faint disabled:hover:bg-card",
  ghost: "text-ink-soft hover:bg-paper-2 hover:text-ink disabled:text-ink-faint disabled:hover:bg-transparent",
  danger: "bg-card text-rose-700 border border-rose-200 hover:bg-rose-50",
};

export function Button({
  variant = "secondary",
  size = "md",
  className = "",
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: BtnVariant; size?: "sm" | "md" | "lg" }) {
  const sz = size === "sm" ? "px-3 py-1.5 text-xs" : size === "lg" ? "px-8 py-3.5 text-base" : "px-4 py-2 text-sm";
  return (
    <button
      type="button"
      {...rest}
      className={`inline-flex items-center justify-center gap-1.5 rounded-full font-medium transition-colors ${sz} ${BTN[variant]} ${className}`}
    />
  );
}

export interface TabDef<T extends string> {
  id: T;
  label: ReactNode;
  count?: number;
}

export function Tabs<T extends string>({
  tabs,
  value,
  onChange,
  variant = "underline",
  className = "",
}: {
  tabs: TabDef<T>[];
  value: T;
  onChange: (v: T) => void;
  variant?: "underline" | "pill";
  className?: string;
}) {
  return (
    <div role="tablist" className={`scroll-thin flex gap-1 overflow-x-auto ${variant === "underline" ? "border-b border-line" : ""} ${className}`}>
      {tabs.map((t) => {
        const active = t.id === value;
        const base = "shrink-0 whitespace-nowrap text-sm transition-colors";
        const cls =
          variant === "underline"
            ? `${base} px-3 py-2 -mb-px border-b-2 ${active ? "border-gold font-bold text-ink" : "border-transparent text-ink-soft hover:text-ink"}`
            : `${base} rounded-full px-3 py-1 ${active ? "bg-navy font-medium text-white" : "bg-card text-ink-soft border border-line hover:bg-paper-2"}`;
        return (
          <button key={t.id} role="tab" aria-selected={active} type="button" onClick={() => onChange(t.id)} className={cls}>
            {t.label}
            {t.count !== undefined && t.count > 0 && (
              <span className={`ml-1 rounded-full px-1.5 text-[10px] ${active && variant === "pill" ? "bg-white/20" : "bg-paper-2 text-ink-soft"}`}>{t.count}</span>
            )}
          </button>
        );
      })}
    </div>
  );
}

export function StanceDot({ stance, size = 10, withLabel = false }: { stance?: Stance; size?: number; withLabel?: boolean }) {
  const color = stance ? STANCE_COLOR[stance] : "#d6d0c2";
  return (
    <span className="inline-flex items-center gap-1" title={stance ? STANCE_LABEL[stance] : "未表明"}>
      <span className="inline-block rounded-full" style={{ width: size, height: size, background: color }} />
      {withLabel && <span className="text-xs text-ink-soft">{stance ? STANCE_LABEL[stance] : "未表明"}</span>}
    </span>
  );
}

/** Round face-crop of an avatar, for lists. */
export function PersonAvatar({
  participant,
  size = 40,
  expression = "neutral",
  ring,
}: {
  participant: Participant;
  size?: number;
  expression?: Expression;
  ring?: string;
}) {
  const s = size / 80;
  return (
    <span
      className="relative inline-block shrink-0 overflow-hidden rounded-full bg-gradient-to-b from-gold-soft to-paper-2"
      style={{ width: size, height: size, boxShadow: ring ? `0 0 0 2px ${ring}` : "0 0 0 1px rgba(26,39,68,0.12)" }}
      aria-hidden
    >
      <span className="absolute" style={{ left: (size - 120 * s) / 2, top: -6 * s }}>
        <Avatar participant={participant} expression={expression} scale={s} standalone />
      </span>
    </span>
  );
}

export function EmptyState({ children }: { children: ReactNode }) {
  return <div className="rounded-xl border border-dashed border-line bg-paper/60 px-4 py-8 text-center text-sm text-ink-soft">{children}</div>;
}
