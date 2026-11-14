// Small color / hash helpers shared by the room components.

function parseHex(hex: string): [number, number, number] {
  let h = hex.replace("#", "");
  if (h.length === 3) h = h.split("").map((c) => c + c).join("");
  const n = parseInt(h.padEnd(6, "0").slice(0, 6), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function toHex(r: number, g: number, b: number): string {
  const c = (v: number) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, "0");
  return `#${c(r)}${c(g)}${c(b)}`;
}

/** Mix color a toward b by t (0..1). */
export function mix(a: string, b: string, t: number): string {
  const [r1, g1, b1] = parseHex(a);
  const [r2, g2, b2] = parseHex(b);
  return toHex(r1 + (r2 - r1) * t, g1 + (g2 - g1) * t, b1 + (b2 - b1) * t);
}
export const darken = (c: string, t: number) => mix(c, "#000000", t);
export const lighten = (c: string, t: number) => mix(c, "#ffffff", t);

export function hash(str: string): number {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

/** Visual width of a string (full-width = 1, other = 0.56). */
export function visualWidth(s: string): number {
  let w = 0;
  for (const ch of s) w += ch.charCodeAt(0) > 0x2e80 ? 1 : 0.56;
  return w;
}

/** Clip a string to a visual width (in full-width units), adding an ellipsis. */
export function clipText(s: string, maxUnits: number): string {
  if (visualWidth(s) <= maxUnits) return s;
  let out = "";
  let w = 0;
  for (const ch of s) {
    const cw = ch.charCodeAt(0) > 0x2e80 ? 1 : 0.56;
    if (w + cw > maxUnits - 1) break;
    out += ch;
    w += cw;
  }
  return out + "…";
}
