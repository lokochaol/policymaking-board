"use client";

import { useState } from "react";
import type { Participant, ResearchBrief } from "@/lib/types";
import { getRole } from "@/data/roles";
import { Badge, PersonAvatar } from "./index";
import { Icon } from "./icons";
import { researchStatusStyle } from "./semantic";

export function safeHref(url: string | undefined): string | undefined {
  if (!url) return undefined;
  try {
    const u = new URL(url);
    return u.protocol === "http:" || u.protocol === "https:" ? u.toString() : undefined;
  } catch {
    return undefined;
  }
}

function SrcLink({ title, url }: { title: string; url: string }) {
  const href = safeHref(url);
  if (!href) return <span className="text-ink-2">{title}</span>;
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className="break-all text-blue underline decoration-blue/30 underline-offset-2 hover:text-blue-strong">
      {title || href}
    </a>
  );
}

export function ResearchBriefCard({ participant, brief, defaultOpen = false }: { participant: Participant; brief?: ResearchBrief; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  const role = getRole(participant.roleId);
  const status = brief?.status ?? "pending";
  const rs = researchStatusStyle(status);
  const hasBody = brief && status !== "pending";
  return (
    <div className="rounded-md border border-line bg-surface">
      <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} className="flex w-full items-center gap-3 p-3 text-left">
        <PersonAvatar participant={participant} size={36} />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-medium">{participant.name}</span>
          <span className="block truncate text-xs text-ink-2">{role?.title ?? participant.roleId}</span>
        </span>
        <Badge tone={rs.tone}>
          <span className={rs.pulse ? "pulse-dot inline-flex" : "inline-flex"}>
            <Icon name={rs.icon} size={12} />
          </span>
          {rs.label}
        </Badge>
        <Icon name="chevron" size={14} className={`text-ink-3 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="space-y-3 border-t border-line px-3 py-3 text-sm">
          {!hasBody && <p className="text-ink-2">まだ調査結果はありません。</p>}
          {hasBody && brief && (
            <>
              {brief.approach && (
                <div>
                  <p className="text-xs font-medium text-ink-2">調べ方</p>
                  <p className="leading-relaxed">{brief.approach}</p>
                </div>
              )}
              {brief.queries.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {brief.queries.map((q, i) => (
                    <span key={i} className="inline-flex items-center gap-1 rounded-sm bg-subtle px-2 py-0.5 text-[11px] text-ink-2">
                      <Icon name="search" size={11} /> {q}
                    </span>
                  ))}
                </div>
              )}
              {brief.summary && (
                <div>
                  <p className="text-xs font-medium text-ink-2">メモ</p>
                  <p className="whitespace-pre-wrap leading-relaxed">{brief.summary}</p>
                </div>
              )}
              {brief.keyFacts.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-ink-2">主な事実</p>
                  <ul className="mt-1 space-y-1.5">
                    {brief.keyFacts.map((f, i) => (
                      <li key={i} className="leading-relaxed">
                        ・{f.fact}
                        {f.source && (
                          <span className="ml-1 text-xs">
                            （<SrcLink title={f.source.title} url={f.source.url} />）
                          </span>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {brief.talkingPoints.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-ink-2">会議で伝えたいこと</p>
                  <ul className="mt-1 list-disc space-y-0.5 pl-5">
                    {brief.talkingPoints.map((t, i) => (
                      <li key={i}>{t}</li>
                    ))}
                  </ul>
                </div>
              )}
              {brief.questionsToRaise.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-ink-2">聞いてみたいこと</p>
                  <ul className="mt-1 list-disc space-y-0.5 pl-5">
                    {brief.questionsToRaise.map((t, i) => (
                      <li key={i}>{t}</li>
                    ))}
                  </ul>
                </div>
              )}
              {brief.sources.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-ink-2">出典</p>
                  <ul className="mt-1 space-y-0.5 text-xs">
                    {brief.sources.map((s, i) => (
                      <li key={i}>
                        <SrcLink title={s.title} url={s.url} />
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
