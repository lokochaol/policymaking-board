"use client";

import { useState } from "react";
import type { Participant, ResearchBrief } from "@/lib/types";
import { getRole } from "@/data/roles";
import { Badge, PersonAvatar } from "./index";

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
  if (!href) return <span className="text-ink-soft">{title}</span>;
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className="break-all text-sky-700 underline decoration-sky-300 underline-offset-2 hover:text-sky-900">
      {title || href}
    </a>
  );
}

export function ResearchBriefCard({ participant, brief, defaultOpen = false }: { participant: Participant; brief?: ResearchBrief; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  const role = getRole(participant.roleId);
  const status = brief?.status ?? "pending";
  const tone = status === "done" ? "green" : status === "failed" ? "red" : status === "researching" ? "blue" : "gray";
  const label = status === "done" ? "調査済み" : status === "failed" ? "調査できず" : status === "researching" ? "調査中…" : "待機中";
  const hasBody = brief && status !== "pending";
  return (
    <div className="rounded-xl border border-line bg-card">
      <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} className="flex w-full items-center gap-3 p-3 text-left">
        <PersonAvatar participant={participant} size={36} />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-bold">{participant.name}</span>
          <span className="block truncate text-xs text-ink-soft">{role?.title ?? participant.roleId}</span>
        </span>
        <Badge tone={tone}>{label}</Badge>
        <span className="text-xs text-ink-faint">{open ? "▲" : "▼"}</span>
      </button>
      {open && (
        <div className="space-y-3 border-t border-line px-3 py-3 text-sm">
          {!hasBody && <p className="text-ink-soft">まだ調査結果はありません。</p>}
          {hasBody && brief && (
            <>
              {brief.approach && (
                <div>
                  <p className="text-xs font-bold text-gold-dark">調べ方</p>
                  <p className="leading-relaxed">{brief.approach}</p>
                </div>
              )}
              {brief.queries.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {brief.queries.map((q, i) => (
                    <span key={i} className="rounded-full bg-paper-2 px-2 py-0.5 text-[11px] text-ink-soft">
                      🔍 {q}
                    </span>
                  ))}
                </div>
              )}
              {brief.summary && (
                <div>
                  <p className="text-xs font-bold text-gold-dark">メモ</p>
                  <p className="whitespace-pre-wrap leading-relaxed">{brief.summary}</p>
                </div>
              )}
              {brief.keyFacts.length > 0 && (
                <div>
                  <p className="text-xs font-bold text-gold-dark">主な事実</p>
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
                  <p className="text-xs font-bold text-gold-dark">会議で伝えたいこと</p>
                  <ul className="mt-1 list-disc space-y-0.5 pl-5">
                    {brief.talkingPoints.map((t, i) => (
                      <li key={i}>{t}</li>
                    ))}
                  </ul>
                </div>
              )}
              {brief.questionsToRaise.length > 0 && (
                <div>
                  <p className="text-xs font-bold text-gold-dark">聞いてみたいこと</p>
                  <ul className="mt-1 list-disc space-y-0.5 pl-5">
                    {brief.questionsToRaise.map((t, i) => (
                      <li key={i}>{t}</li>
                    ))}
                  </ul>
                </div>
              )}
              {brief.sources.length > 0 && (
                <div>
                  <p className="text-xs font-bold text-gold-dark">出典</p>
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
