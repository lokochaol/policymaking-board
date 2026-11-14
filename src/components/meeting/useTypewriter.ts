"use client";

import { useEffect, useRef, useState } from "react";

/** Reveals `text` at `cps` characters per second, restarting whenever `key` changes. */
export function useTypewriter(text: string, key: string | undefined, cps: number): { shown: string; done: boolean } {
  const [state, setState] = useState<{ key?: string; n: number }>({ n: 0 });
  const cpsRef = useRef(cps);
  useEffect(() => {
    cpsRef.current = cps;
  }, [cps]);

  useEffect(() => {
    if (!key) return;
    const t0 = Date.now();
    const tick = () => {
      const c = cpsRef.current;
      const n = Number.isFinite(c) ? Math.min(text.length, Math.floor(((Date.now() - t0) * c) / 1000)) : text.length;
      setState((s) => (s.key === key && s.n === n ? s : { key, n }));
      return n >= text.length;
    };
    if (tick()) return;
    const iv = setInterval(() => {
      if (tick()) clearInterval(iv);
    }, 50);
    return () => clearInterval(iv);
  }, [key, text]);

  if (!key) return { shown: "", done: true };
  const n = state.key === key ? state.n : 0;
  return { shown: text.slice(0, n), done: n >= text.length };
}
