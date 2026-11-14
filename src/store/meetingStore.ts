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
  Stance,
} from "@/lib/types";
import { getMeetingType } from "@/data/meetingTypes";

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
  speed: SpeedId;

  hydrate: () => void;
  createMeeting: (config: MeetingConfig) => string;
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
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: 1, meetings }));
  } catch {
    /* quota or blocked storage: ignore */
  }
}

function scheduleSave() {
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => saveNow(useMeetingStore.getState().meetings), 400);
}

async function readError(r: Response): Promise<string> {
  try {
    const j = await r.json();
    if (j && typeof j.error === "string") return j.error;
  } catch {
    /* ignore */
  }
  return `サーバーエラー (${r.status})`;
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

  const doStep = async (id: string, alive: () => boolean): Promise<{ start: number; count: number } | null> => {
    const m = get().meetings[id];
    if (!m) return null;
    set((s) => ({ busy: { ...s.busy, [id]: "step" }, shown: { ...s.shown, [id]: m.utterances.length } }));
    try {
      const r = await fetch("/api/meeting/step", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ state: { ...m, status: "running", error: undefined } }),
      });
      if (!r.ok) throw new Error(await readError(r));
      const data = (await r.json()) as StepResponse;
      if (!alive()) return null;
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
        usage: data.usage ?? cur.usage,
        pendingDirective: undefined,
        error: undefined,
      }));
      return { start, count: added.length };
    } catch (e) {
      if (alive()) setError(id, "step", e);
      return null;
    } finally {
      set((s) => ({ busy: { ...s.busy, [id]: undefined } }));
    }
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

  const doClose = async (id: string, alive: () => boolean) => {
    const m = get().meetings[id];
    if (!m) return;
    set((s) => ({ busy: { ...s.busy, [id]: "close" } }));
    try {
      const r = await fetch("/api/meeting/close", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ state: { ...m, error: undefined } }),
      });
      if (!r.ok) throw new Error(await readError(r));
      const data = (await r.json()) as CloseResponse;
      if (!alive()) return;
      failedAt.delete(id);
      patch(id, (cur) => ({ outcome: data.outcome, usage: data.usage ?? cur.usage, status: "finished", error: undefined }));
    } catch (e) {
      if (alive()) setError(id, "close", e);
    } finally {
      set((s) => ({ busy: { ...s.busy, [id]: undefined } }));
    }
  };

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
        patch(id, (cur) => ({ research: { ...cur.research, [pid]: skeletonBrief(pid, "researching") } }));
        let brief: ResearchBrief;
        let usage: UsageTotals | undefined;
        try {
          const cur = get().meetings[id];
          if (!cur) return;
          const r = await fetch("/api/meeting/prepare", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ state: { ...cur, status: "preparing", error: undefined }, participantId: pid }),
          });
          if (!r.ok) throw new Error(await readError(r));
          const data = (await r.json()) as PrepareResponse;
          brief = { ...data.brief, participantId: pid };
          usage = data.usage;
        } catch {
          brief = { ...skeletonBrief(pid, "failed"), summary: "事前調査に失敗しました。" };
        }
        if (!alive()) return;
        patch(id, (cur) => ({
          research: { ...cur.research, [pid]: brief },
          usage: usage
            ? {
                inputTokens: cur.usage.inputTokens + usage.inputTokens,
                outputTokens: cur.usage.outputTokens + usage.outputTokens,
                cacheReadTokens: cur.usage.cacheReadTokens + usage.cacheReadTokens,
                estimatedCostUsd: cur.usage.estimatedCostUsd + usage.estimatedCostUsd,
              }
            : cur.usage,
        }));
      }
    };
    await Promise.all(Array.from({ length: Math.min(PREPARE_CONCURRENCY, todo.length) }, worker));
    set((s) => ({ busy: { ...s.busy, [id]: undefined } }));
    if (alive()) patch(id, () => ({ status: "running" }));
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

  const startLoop = (id: string, once = false) => {
    const gen = (gens.get(id) ?? 0) + 1;
    gens.set(id, gen);
    void loop(id, gen, once);
  };

  return {
    hydrated: false,
    meetings: {},
    shown: {},
    busy: {},
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

    createMeeting: (config) => {
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
        usage: emptyUsage(),
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
      const type = getMeetingType(m.config.meetingTypeId);
      const last = Math.max((type?.phases.length ?? 1) - 1, 0);
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
        phaseIndex: Math.max(m.phaseIndex, last),
        phaseTurn: m.phaseIndex >= last ? m.phaseTurn : 0,
        pendingDirective: directive,
        error: undefined,
      }));
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
