"use client";

import { create } from "zustand";
import type {
  MeetingConfig,
  MeetingOutcome,
  MeetingState,
  Minutes,
  UsageTotals,
  Utterance,
  FacilitatorDecision,
  MeetingStatus,
  ResearchBrief,
  SatisfactionReport,
  Stance,
} from "@/lib/types";
import { getMeetingType } from "@/data/meetingTypes";
import { registerCustomRoles } from "@/data/roles";

export const STORAGE_KEY = "pmb:meetings:v1";

export type SpeedId = "slow" | "normal" | "fast" | "fastest";

/** delayMs: wait after each utterance finished typing. cps: typewriter characters per second (Infinity = instant). */
export const SPEEDS: Record<SpeedId, { label: string; delayMs: number; cps: number }> = {
  slow: { label: "ゆっくり", delayMs: 3000, cps: 20 },
  normal: { label: "ふつう", delayMs: 1500, cps: 30 },
  fast: { label: "はやい", delayMs: 500, cps: 40 },
  fastest: { label: "最速", delayMs: 0, cps: Infinity },
};

export function typingMs(text: string, speed: SpeedId): number {
  const cps = SPEEDS[speed].cps;
  if (!Number.isFinite(cps)) return 40;
  return Math.ceil((text.length / cps) * 1000);
}

interface StepResponse {
  utterances?: Utterance[];
  minutes?: Minutes;
  phaseIndex: number;
  phaseTurn: number;
  turn: number;
  status: MeetingStatus;
  initialStances?: Record<string, { stance: Stance; summary: string }>;
  usage: UsageTotals;
}

interface PrepareResponse {
  brief: ResearchBrief;
  usage: UsageTotals;
}

function skeletonBrief(participantId: string, status: ResearchBrief["status"]): ResearchBrief {
  return { participantId, status, queries: [], approach: "", summary: "", keyFacts: [], talkingPoints: [], questionsToRaise: [], sources: [] };
}

const PREPARE_CONCURRENCY = 3;

interface CloseResponse {
  outcome: MeetingOutcome;
  usage: UsageTotals;
  degraded?: boolean;
}

interface SatisfactionResponse {
  reports: SatisfactionReport[];
  usage: UsageTotals;
}

/** True when the server flagged (or visibly marked) the outcome as the degraded fallback. */
export function isDegradedOutcome(o?: MeetingOutcome): boolean {
  if (!o) return false;
  const flagged = o as MeetingOutcome & { degraded?: boolean; failed?: boolean; fallback?: boolean };
  if (flagged.degraded || flagged.failed || flagged.fallback) return true;
  return /簡易版/.test(`${o.title ?? ""}${o.executiveSummary ?? ""}`);
}

function addUsage(a: UsageTotals, b: UsageTotals): UsageTotals {
  return {
    inputTokens: a.inputTokens + b.inputTokens,
    outputTokens: a.outputTokens + b.outputTokens,
    cacheReadTokens: a.cacheReadTokens + b.cacheReadTokens,
    estimatedCostUsd: a.estimatedCostUsd + b.estimatedCostUsd,
  };
}

/** Cumulative usage never goes backwards: keep whichever side has spent more. */
function maxUsage(a: UsageTotals, b?: UsageTotals): UsageTotals {
  return b && b.estimatedCostUsd > a.estimatedCostUsd ? b : a;
}

export function emptyMinutes(): Minutes {
  return { summary: "", agendaItems: [], issues: [], proposals: [], keyExchanges: [], coveredThroughTurn: 0 };
}

export function emptyUsage(): UsageTotals {
  return { inputTokens: 0, outputTokens: 0, cacheReadTokens: 0, estimatedCostUsd: 0 };
}

interface MeetingStore {
  hydrated: boolean;
  meetings: Record<string, MeetingState>;
  /** Ephemeral: number of utterances already "played" per meeting (undefined = all). */
  shown: Record<string, number>;
  /** Ephemeral: request in flight. */
  busy: Record<string, "step" | "close" | undefined>;
  /** Ephemeral: localStorage could not be written (quota / blocked). */
  storageFull: boolean;
  speed: SpeedId;

  hydrate: () => void;
  createMeeting: (config: MeetingConfig, initialUsage?: UsageTotals) => string;
  /** Re-run the final write-up (reuses the stored satisfaction reports). */
  regenerateOutcome: (id: string) => void;
  /** Delete the oldest finished meetings to free storage. Returns the number removed. */
  pruneOld: (keep: number) => number;
  deleteMeeting: (id: string) => void;
  setSpeed: (s: SpeedId) => void;
  /** Called when the meeting page mounts: continues running/closing meetings. */
  attach: (id: string) => void;
  /** Called when the meeting page unmounts: stops the loop without changing status. */
  detach: (id: string) => void;
  resume: (id: string) => void;
  pause: (id: string) => void;
  stepOnce: (id: string) => void;
  requestClose: (id: string) => void;
  retry: (id: string) => void;
}

const gens = new Map<string, number>();
const failedAt = new Map<string, "step" | "close">();
/** Paid requests currently in flight, shared across remounts (StrictMode, navigation): meetingId -> key -> promise. */
const inflight = new Map<string, Map<string, Promise<unknown>>>();
/** A close was requested while a step was in flight; apply the wrap-up directive when it lands. */
const closeRequested = new Set<string>();

function shared<T>(id: string, key: string, make: () => Promise<T>): Promise<T> {
  let m = inflight.get(id);
  if (!m) inflight.set(id, (m = new Map()));
  const existing = m.get(key);
  if (existing) return existing as Promise<T>;
  const p = make().finally(() => {
    const cur = inflight.get(id);
    cur?.delete(key);
    if (cur && cur.size === 0) inflight.delete(id);
  });
  m.set(key, p);
  return p;
}
const isInflight = (id: string, key: string) => !!inflight.get(id)?.has(key);
let saveTimer: ReturnType<typeof setTimeout> | null = null;
let subscribed = false;

function sleep(ms: number) {
  return new Promise<void>((r) => setTimeout(r, ms));
}

function newId(): string {
  try {
    if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  } catch {
    /* fall through */
  }
  return `m-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export { newId };

function saveNow(meetings: Record<string, MeetingState>) {
  let ok = true;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: 1, meetings }));
  } catch {
    ok = false;
  }
  if (useMeetingStore.getState().storageFull === ok) useMeetingStore.setState({ storageFull: !ok });
}

function scheduleSave() {
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => saveNow(useMeetingStore.getState().meetings), 400);
}

async function readError(r: Response): Promise<string> {
  try {
    const j = await r.json();
    if (j && typeof j.error === "string") return r.status === 400 ? `入力内容を受け付けられませんでした：${j.error}` : j.error;
  } catch {
    /* ignore */
  }
  return r.status === 400 ? "入力内容がサーバーの受け付け範囲を超えています（人数・文字数などをご確認ください）" : `サーバーエラー (${r.status})`;
}

export const useMeetingStore = create<MeetingStore>((set, get) => {
  const patch = (id: string, fn: (m: MeetingState) => Partial<MeetingState>) => {
    set((s) => {
      const m = s.meetings[id];
      if (!m) return s;
      return { meetings: { ...s.meetings, [id]: { ...m, ...fn(m) } } };
    });
  };

  const setError = (id: string, kind: "step" | "close", e: unknown) => {
    failedAt.set(id, kind);
    const msg = e instanceof Error ? e.message : String(e);
    patch(id, () => ({ status: "error", error: msg }));
  };

  /** Sleep that re-evaluates the needed time against the live speed setting. */
  const waitFor = async (alive: () => boolean, needed: (speed: SpeedId) => number) => {
    const t0 = Date.now();
    while (alive()) {
      if (Date.now() - t0 >= needed(get().speed)) return;
      await sleep(60);
    }
  };

  const doStep = (id: string, alive: () => boolean): Promise<{ start: number; count: number } | null> =>
    shared(id, "step", async () => {
      const m = get().meetings[id];
      if (!m) return null;
      const sentDirective = m.pendingDirective;
      set((s) => ({ busy: { ...s.busy, [id]: "step" }, shown: { ...s.shown, [id]: m.utterances.length } }));
      try {
        const r = await fetch("/api/meeting/step", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ state: { ...m, status: "running", error: undefined } }),
        });
        if (!r.ok) throw new Error(await readError(r));
        const data = (await r.json()) as StepResponse;
        const now = get().meetings[id];
        if (!now) return null;
        // The paid result is applied even if the loop was superseded (detach, pause/resume),
        // as long as the state it was computed from is still current. Otherwise only the spend is kept.
        if (now.utterances.length !== m.utterances.length) {
          patch(id, (cur) => ({ usage: maxUsage(cur.usage, data.usage) }));
          return null;
        }
        const start = m.utterances.length;
        const added = data.utterances ?? [];
        patch(id, (cur) => ({
          utterances: [...cur.utterances, ...added],
          minutes: data.minutes ?? cur.minutes,
          phaseIndex: data.phaseIndex,
          phaseTurn: data.phaseTurn,
          turn: data.turn,
          status: data.status === "closing" ? "closing" : cur.status === "paused" ? "paused" : "running",
          initialStances: data.initialStances ? { ...cur.initialStances, ...data.initialStances } : cur.initialStances,
          usage: maxUsage(cur.usage, data.usage),
          // Keep a directive that was queued while this step was in flight.
          pendingDirective: cur.pendingDirective === sentDirective ? undefined : cur.pendingDirective,
          error: undefined,
        }));
        if (closeRequested.has(id)) {
          closeRequested.delete(id);
          if (get().meetings[id]?.status !== "closing") applyClose(id);
        }
        if (!alive()) {
          set((s) => ({ shown: { ...s.shown, [id]: get().meetings[id]?.utterances.length ?? 0 } }));
          return null;
        }
        return { start, count: added.length };
      } catch (e) {
        if (alive()) setError(id, "step", e);
        return null;
      } finally {
        set((s) => ({ busy: { ...s.busy, [id]: undefined } }));
      }
    });

  /** Jump to the last round-robin phase (final stance check) and have the chair open the wrap-up. */
  const applyClose = (id: string) => {
    const m = get().meetings[id];
    if (!m) return;
    const phases = getMeetingType(m.config.meetingTypeId)?.phases ?? [];
    const last = Math.max(phases.length - 1, 0);
    let target = -1;
    phases.forEach((ph, i) => {
      if (ph.roundRobin) target = i;
    });
    if (target < 0 || target < m.phaseIndex) target = last;
    const idx = Math.max(m.phaseIndex, target);
    const directive: FacilitatorDecision = {
      nextSpeakerId: m.config.facilitatorId,
      facilitatorRemark: "",
      prompt: "時間が近づいてきました。ここまでの議論をまとめに入ってください。論点と合意点を整理し、各人に最終的な賛否を確認してください。",
      advancePhase: false,
      endMeeting: false,
      innerThought: "",
    };
    patch(id, () => ({
      status: "running",
      phaseIndex: idx,
      phaseTurn: idx === m.phaseIndex ? m.phaseTurn : 0,
      pendingDirective: directive,
      error: undefined,
    }));
  };

  const play = async (id: string, alive: () => boolean, start: number, count: number) => {
    for (let i = 0; i < count && alive(); i++) {
      set((s) => ({ shown: { ...s.shown, [id]: start + i + 1 } }));
      const text = get().meetings[id]?.utterances[start + i]?.text ?? "";
      await waitFor(alive, (speed) => typingMs(text, speed) + SPEEDS[speed].delayMs);
    }
    if (count === 0) await waitFor(alive, (speed) => Math.max(SPEEDS[speed].delayMs, 50));
    if (alive()) set((s) => ({ shown: { ...s.shown, [id]: get().meetings[id]?.utterances.length ?? 0 } }));
  };

  const postJson = async <T,>(url: string, body: unknown): Promise<T> => {
    const r = await fetch(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
    if (!r.ok) throw new Error(await readError(r));
    return (await r.json()) as T;
  };

  /** Step 1 of the close: satisfaction reports (stored in state.closingReports and persisted). Shared + idempotent. */
  const runSatisfaction = (id: string) =>
    shared(id, "satisfaction", async () => {
      const m = get().meetings[id];
      if (!m || m.closingReports) return;
      const data = await postJson<SatisfactionResponse>("/api/meeting/close/satisfaction", { state: { ...m, error: undefined } });
      patch(id, (cur) => ({ closingReports: data.reports, usage: maxUsage(cur.usage, data.usage) }));
    });

  /** Step 2: outcome, built from the stored closingReports. Shared + idempotent. */
  const runOutcome = (id: string) =>
    shared(id, "close", async () => {
      const m = get().meetings[id];
      if (!m) return;
      const data = await postJson<CloseResponse>("/api/meeting/close", { state: { ...m, error: undefined } });
      failedAt.delete(id);
      patch(id, (cur) => ({ outcome: data.degraded ? ({ ...data.outcome, degraded: true } as MeetingOutcome) : data.outcome, usage: maxUsage(cur.usage, data.usage), status: "finished", error: undefined }));
    });

  const doClose = async (id: string, alive: () => boolean) => {
    if (!get().meetings[id]) return;
    set((s) => ({ busy: { ...s.busy, [id]: "close" } }));
    try {
      if (!get().meetings[id]?.closingReports) await runSatisfaction(id);
      await runOutcome(id);
    } catch (e) {
      if (alive()) setError(id, "close", e);
    } finally {
      if (alive()) set((s) => ({ busy: { ...s.busy, [id]: undefined } }));
    }
  };

  /** One research request per participant, shared across remounts; the result is applied whichever loop is alive. */
  const runPrepare = (id: string, pid: string) =>
    shared(id, `prepare:${pid}`, async () => {
      patch(id, (cur) => ({ research: { ...cur.research, [pid]: skeletonBrief(pid, "researching") } }));
      let brief: ResearchBrief;
      let usage: UsageTotals | undefined;
      try {
        const cur = get().meetings[id];
        if (!cur) return;
        const data = await postJson<PrepareResponse>("/api/meeting/prepare", { state: { ...cur, status: "preparing", error: undefined }, participantId: pid });
        brief = { ...data.brief, participantId: pid };
        usage = data.usage;
      } catch {
        brief = { ...skeletonBrief(pid, "failed"), summary: "事前調査に失敗しました。" };
      }
      patch(id, (cur) => {
        // Only skip when the participant's brief was already settled by someone else.
        const st = cur.research?.[pid]?.status;
        if (st === "done" || st === "failed") return {};
        return { research: { ...cur.research, [pid]: brief }, usage: usage ? addUsage(cur.usage, usage) : cur.usage };
      });
    });

  const doPrepare = async (id: string, alive: () => boolean) => {
    const m0 = get().meetings[id];
    if (!m0) return;
    const todo = m0.config.participants
      .map((p) => p.id)
      .filter((pid) => {
        const st = m0.research?.[pid]?.status;
        return st !== "done" && st !== "failed";
      });
    set((s) => ({ busy: { ...s.busy, [id]: "step" } }));
    let next = 0;
    const worker = async () => {
      while (alive()) {
        const pid = todo[next++];
        if (!pid) return;
        await runPrepare(id, pid);
      }
    };
    await Promise.all(Array.from({ length: Math.min(PREPARE_CONCURRENCY, todo.length) }, worker));
    if (alive()) {
      set((s) => ({ busy: { ...s.busy, [id]: undefined } }));
      patch(id, () => ({ status: "running" }));
    }
  };

  const loop = async (id: string, gen: number, once: boolean) => {
    const alive = () => gens.get(id) === gen;
    while (alive()) {
      const m = get().meetings[id];
      if (!m) return;
      if (m.status === "preparing") {
        await doPrepare(id, alive);
        continue;
      }
      if (m.status === "closing") {
        await doClose(id, alive);
        return;
      }
      if (once ? m.status !== "paused" && m.status !== "running" : m.status !== "running") return;
      const res = await doStep(id, alive);
      if (!res) return;
      await play(id, alive, res.start, res.count);
      if (once && get().meetings[id]?.status !== "closing") return;
    }
  };

  /**
   * Start (or supersede) the loop. If a paid /step is in flight its result is still applied;
   * the new loop waits for it instead of re-sending the same state.
   */
  const startLoop = (id: string, once = false) => {
    const gen = (gens.get(id) ?? 0) + 1;
    gens.set(id, gen);
    const pending = inflight.get(id)?.get("step");
    if (pending) {
      void pending.then(
        () => gens.get(id) === gen && void loop(id, gen, once),
        () => gens.get(id) === gen && void loop(id, gen, once),
      );
      return;
    }
    void loop(id, gen, once);
  };

  return {
    hydrated: false,
    meetings: {},
    shown: {},
    busy: {},
    storageFull: false,
    speed: "normal",

    hydrate: () => {
      if (get().hydrated) return;
      let meetings: Record<string, MeetingState> = {};
      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw);
          const src = parsed && typeof parsed === "object" && parsed.meetings ? parsed.meetings : {};
          for (const [k, v] of Object.entries(src as Record<string, MeetingState>)) {
            if (v && v.config && Array.isArray(v.utterances)) {
              registerCustomRoles(v.config.customRoles);
              const fixed = { ...v, research: v.research ?? {} };
              meetings[k] = fixed.status === "running" ? { ...fixed, status: "paused" } : fixed;
            }
          }
        }
      } catch {
        meetings = {};
      }
      // Meetings created before hydration finished must win.
      set((s) => ({ hydrated: true, meetings: { ...meetings, ...s.meetings } }));
      if (!subscribed) {
        subscribed = true;
        useMeetingStore.subscribe((s, prev) => {
          if (s.meetings !== prev.meetings) scheduleSave();
        });
      }
    },

    createMeeting: (config, initialUsage) => {
      registerCustomRoles(config.customRoles);
      const state: MeetingState = {
        config,
        status: "preparing",
        research: {},
        phaseIndex: 0,
        turn: 0,
        phaseTurn: 0,
        utterances: [],
        minutes: emptyMinutes(),
        initialStances: {},
        usage: initialUsage ? { ...initialUsage } : emptyUsage(),
      };
      set((s) => ({ meetings: { ...s.meetings, [config.id]: state }, shown: { ...s.shown, [config.id]: 0 } }));
      saveNow(get().meetings);
      return config.id;
    },

    deleteMeeting: (id) => {
      gens.set(id, (gens.get(id) ?? 0) + 1);
      set((s) => {
        const rest = { ...s.meetings };
        delete rest[id];
        return { meetings: rest };
      });
      saveNow(get().meetings);
    },

    pruneOld: (keep) => {
      const finished = Object.values(get().meetings)
        .filter((m) => m.status === "finished")
        .sort((a, b) => b.config.createdAt.localeCompare(a.config.createdAt));
      const drop = finished.slice(Math.max(keep, 0));
      if (drop.length === 0) return 0;
      set((s) => {
        const rest = { ...s.meetings };
        for (const m of drop) delete rest[m.config.id];
        return { meetings: rest };
      });
      saveNow(get().meetings);
      return drop.length;
    },

    regenerateOutcome: (id) => {
      const m = get().meetings[id];
      if (!m || m.status !== "finished") return;
      failedAt.delete(id);
      patch(id, () => ({ outcome: undefined, status: "closing", error: undefined }));
    },

    setSpeed: (speed) => set({ speed }),

    attach: (id) => {
      const m = get().meetings[id];
      if (!m) return;
      if (m.status === "running" || m.status === "closing" || m.status === "preparing") startLoop(id);
    },

    detach: (id) => {
      gens.set(id, (gens.get(id) ?? 0) + 1);
      set((s) => ({ busy: { ...s.busy, [id]: undefined } }));
    },

    resume: (id) => {
      const m = get().meetings[id];
      if (!m || m.status === "finished" || m.status === "closing" || m.status === "preparing") return;
      patch(id, () => ({ status: "running", error: undefined }));
      startLoop(id);
    },

    pause: (id) => {
      const m = get().meetings[id];
      if (!m || m.status !== "running") return;
      patch(id, () => ({ status: "paused" }));
    },

    stepOnce: (id) => {
      const m = get().meetings[id];
      if (!m || (m.status !== "paused" && m.status !== "running")) return;
      if (get().busy[id]) return;
      if (m.status === "running") patch(id, () => ({ status: "paused" }));
      startLoop(id, true);
    },

    requestClose: (id) => {
      const m = get().meetings[id];
      if (!m || m.status === "finished" || m.status === "closing" || m.status === "preparing") return;
      // A failed close must retry the close, not restart the discussion.
      if (m.status === "error" && failedAt.get(id) === "close") {
        get().retry(id);
        return;
      }
      if (isInflight(id, "step")) {
        // The in-flight step's result will be applied first; then the wrap-up directive.
        closeRequested.add(id);
        patch(id, () => ({ status: "running", error: undefined }));
      } else {
        applyClose(id);
      }
      startLoop(id);
    },

    retry: (id) => {
      const m = get().meetings[id];
      if (!m || m.status !== "error") return;
      const kind = failedAt.get(id) ?? "step";
      patch(id, () => ({ status: kind === "close" ? "closing" : "running", error: undefined }));
      startLoop(id);
    },
  };
});
