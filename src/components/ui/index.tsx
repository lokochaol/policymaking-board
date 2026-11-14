"use client";

import type { ReactNode, ButtonHTMLAttributes } from "react";
import type { DisclosureLevel, Participant, Proposal, Stance } from "@/lib/types";
import Avatar from "@/components/room/Avatar";
import type { Expression } from "@/components/room/types";
import { Icon } from "./icons";
import { STANCES } from "./labels";
import { BADGE_CLASS, consentStyle, disclosureMeta, proposalStatusStyle, stanceStyle, type Tone } from "./semantic";

export type { Tone };

export function Badge({ tone = "neutral", children, className = "" }: { tone?: Tone; children: ReactNode; className?: string }) {
  return (
    <span className={`inline-flex items-center gap-1 whitespace-nowrap rounded-sm border px-2 py-0.5 text-xs font-medium leading-5 ${BADGE_CLASS[tone]} ${className}`}>
      {children}
    </span>
  );
}

/** Ink outline + icon. Disclosure carries no colour, so it never competes with stance colours. */
export function DisclosureBadge({ level }: { level: DisclosureLevel }) {
  const meta = disclosureMeta(level);
  return (
    <Badge tone="ink">
      <Icon name={meta.icon} size={12} />
      {meta.label}
    </Badge>
  );
}

export function ProposalStatusBadge({ status }: { status: Proposal["status"] }) {
  const s = proposalStatusStyle(status);
  return (
    <Badge tone={s.tone}>
      {s.split && <span aria-hidden className="inline-block h-2 w-2 rounded-full" style={{ background: "linear-gradient(90deg, var(--color-teal) 50%, var(--color-coral) 50%)" }} />}
      {s.label}
    </Badge>
  );
}

export function Card({ children, className = "", as: Tag = "div" }: { children: ReactNode; className?: string; as?: "div" | "section" | "article" }) {
  return <Tag className={`rounded-md border border-line bg-surface ${className}`}>{children}</Tag>;
}

export function SectionTitle({ children, sub, step }: { children: ReactNode; sub?: ReactNode; step?: number }) {
  return (
    <div className="mb-4 flex flex-wrap items-baseline gap-x-3 gap-y-1">
      {step !== undefined && (
        <span className="grid h-6 w-6 shrink-0 translate-y-0.5 place-items-center rounded-full border border-ink text-xs font-semibold tabular-nums text-ink">{step}</span>
      )}
      <h2 className="text-base font-semibold text-ink">{children}</h2>
      {sub && <span className="text-xs text-ink-2">{sub}</span>}
    </div>
  );
}

type BtnVariant = "primary" | "secondary" | "ghost" | "danger";
const BTN: Record<BtnVariant, string> = {
  primary: "border border-ink bg-ink text-white hover:bg-ink/90 disabled:border-line disabled:bg-subtle disabled:text-ink-3",
  secondary: "border border-line bg-white text-ink hover:border-ink-3 hover:bg-subtle disabled:text-ink-3 disabled:hover:border-line disabled:hover:bg-white",
  ghost: "border border-transparent text-ink-2 hover:bg-subtle hover:text-ink disabled:text-ink-3 disabled:hover:bg-transparent",
  danger: "border border-line bg-white text-coral-strong hover:border-coral/60 hover:bg-coral-tint disabled:text-ink-3 disabled:hover:border-line disabled:hover:bg-white",
};

export function Button({
  variant = "secondary",
  size = "md",
  className = "",
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: BtnVariant; size?: "sm" | "md" | "lg" }) {
  const sz = size === "sm" ? "px-3 py-1 text-xs" : size === "lg" ? "px-6 py-2.5 text-sm" : "px-4 py-1.5 text-sm";
  return (
    <button
      type="button"
      {...rest}
      className={`inline-flex items-center justify-center gap-1.5 rounded-md font-medium transition-colors ${sz} ${BTN[variant]} ${className}`}
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
    <div role="tablist" className={`scroll-thin flex overflow-x-auto ${variant === "underline" ? "gap-1 border-b border-line" : "gap-1.5"} ${className}`}>
      {tabs.map((t) => {
        const active = t.id === value;
        const base = "shrink-0 whitespace-nowrap text-sm transition-colors";
        const cls =
          variant === "underline"
            ? `${base} -mb-px border-b-2 px-2.5 py-2 ${active ? "border-blue font-medium text-blue-strong" : "border-transparent text-ink-2 hover:text-ink"}`
            : `${base} rounded-sm border px-2.5 py-1 text-xs ${active ? "border-blue/50 bg-blue-tint font-medium text-blue-strong" : "border-line bg-white text-ink-2 hover:border-ink-3 hover:text-ink"}`;
        return (
          <button key={t.id} role="tab" aria-selected={active} type="button" onClick={() => onChange(t.id)} className={cls}>
            {t.label}
            {t.count !== undefined && t.count > 0 && (
              <span className={`ml-1.5 text-[11px] tabular-nums ${active ? "text-blue" : "text-ink-3"}`}>{t.count}</span>
            )}
          </button>
        );
      })}
    </div>
  );
}

/** strong_support = filled teal, support = teal ring, neutral = ink-3, concern = yellow, oppose = coral. */
export function StanceDot({ stance, size = 10, withLabel = false }: { stance?: Stance; size?: number; withLabel?: boolean }) {
  const s = stanceStyle(stance);
  return (
    <span className="inline-flex items-center gap-1.5" title={s.label}>
      <span
        className="inline-block shrink-0 rounded-full"
        style={{
          width: size,
          height: size,
          background: s.fill === "solid" ? s.color : "white",
          border: `${s.fill === "ring" ? 2 : 1}px solid ${s.edge}`,
        }}
      />
      {withLabel && <span className="text-xs text-ink-2">{s.label}</span>}
    </span>
  );
}

export function StanceLegend({ className = "" }: { className?: string }) {
  return (
    <div className={`flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-ink-2 ${className}`} aria-label="スタンスの凡例">
      {[...STANCES].reverse().map((s) => (
        <StanceDot key={s} stance={s} size={9} withLabel />
      ))}
    </div>
  );
}

export function ConsentLegend({ className = "" }: { className?: string }) {
  return (
    <div className={`flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-ink-2 ${className}`} aria-label="納得度の凡例">
      {[5, 4, 3, 2, 1].map((c) => {
        const s = consentStyle(c);
        return (
          <span key={c} className="flex items-center gap-1.5">
            <span className={`inline-block h-2 w-4 rounded-full ${s.bar}`} />
            {s.label}
          </span>
        );
      })}
    </div>
  );
}

/** Round face-crop of an avatar, for lists. `ring` is a semantic CSS colour (use stanceStyle). */
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
      className="relative inline-block shrink-0 overflow-hidden rounded-full bg-subtle"
      style={{ width: size, height: size, boxShadow: ring ? `0 0 0 2px ${ring}` : "0 0 0 1px var(--color-line)" }}
      aria-hidden
    >
      <span className="absolute" style={{ left: (size - 120 * s) / 2, top: -6 * s }}>
        <Avatar participant={participant} expression={expression} scale={s} standalone />
      </span>
    </span>
  );
}

export function EmptyState({ children }: { children: ReactNode }) {
  return <div className="rounded-md border border-dashed border-line px-4 py-8 text-center text-sm text-ink-2">{children}</div>;
}

export function Spinner({ small = false }: { small?: boolean }) {
  return <span aria-hidden className={`inline-block animate-spin rounded-full border-2 border-blue border-t-transparent ${small ? "h-3 w-3" : "h-4 w-4"}`} />;
}

/** Error = coral tint, warning = yellow tint. */
export function Notice({ kind, children, className = "", role }: { kind: "error" | "warn" | "info"; children: ReactNode; className?: string; role?: string }) {
  const cls =
    kind === "error"
      ? "border-coral/40 bg-coral-tint text-coral-strong"
      : kind === "warn"
        ? "border-yellow bg-yellow-tint text-ink"
        : "border-blue/30 bg-blue-tint text-blue-strong";
  return (
    <div role={role} className={`flex flex-wrap items-center gap-x-3 gap-y-2 rounded-md border px-4 py-2.5 text-sm ${cls} ${className}`}>
      {children}
    </div>
  );
}
