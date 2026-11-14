import type { ReactNode } from "react";
import { darken, lighten, r2 } from "../util";

export type TimeOfDay = "morning" | "day" | "evening" | "night";

export interface BackdropProps {
  uid: string;
  tod: TimeOfDay;
  boardTitle?: string;
  boardSubtitle?: string;
}

export interface SkyPalette {
  top: string;
  mid: string;
  bottom: string;
  sun: string | null;
  sunX: number; // 0..1 inside window
  sunY: number; // 0..1
  stars: boolean;
  moon: boolean;
  shaft: string;
  shaftOpacity: number;
  /** mountain / hill tint multiplier */
  far: string;
  near: string;
  field: string;
  ambient: string; // overlay colour
  ambientOpacity: number;
  lit: boolean; // interior lights prominent
}

export const SKY: Record<TimeOfDay, SkyPalette> = {
  morning: { top: "#8ec9f0", mid: "#cfe6f5", bottom: "#fde3b8", sun: "#fff3c4", sunX: 0.22, sunY: 0.62, stars: false, moon: false, shaft: "#fff0c2", shaftOpacity: 0.5, far: "#9fb7d0", near: "#78a47a", field: "#b8d37a", ambient: "#ffd9a0", ambientOpacity: 0.05, lit: false },
  day: { top: "#4fa3e8", mid: "#91c9f2", bottom: "#d6eefc", sun: "#fffbe0", sunX: 0.72, sunY: 0.22, stars: false, moon: false, shaft: "#ffffff", shaftOpacity: 0.42, far: "#8fb0cf", near: "#5f9f62", field: "#9ccb58", ambient: "#ffffff", ambientOpacity: 0, lit: false },
  evening: { top: "#46508f", mid: "#d6769a", bottom: "#ffab66", sun: "#ffd89a", sunX: 0.7, sunY: 0.7, stars: false, moon: false, shaft: "#ffb26b", shaftOpacity: 0.5, far: "#6b5f8f", near: "#4a5a58", field: "#8f9a4c", ambient: "#ff9a55", ambientOpacity: 0.09, lit: true },
  night: { top: "#070d27", mid: "#16214f", bottom: "#2b3a78", sun: null, sunX: 0.75, sunY: 0.25, stars: true, moon: true, shaft: "#8ea6ea", shaftOpacity: 0.16, far: "#1c2748", near: "#141d38", field: "#1b2a3a", ambient: "#0a1138", ambientOpacity: 0.26, lit: true },
};

export function timeOfDay(d: Date): TimeOfDay {
  const h = d.getHours();
  if (h >= 5 && h < 10) return "morning";
  if (h >= 10 && h < 16) return "day";
  if (h >= 16 && h < 19) return "evening";
  return "night";
}

/** Deterministic pseudo random for decorations (stars etc.). */
export function rng(seed: number) {
  let s = seed >>> 0 || 1;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

export const WALL_Y = 360;

/** Perspective floor lines converging toward a vanishing point above the horizon. */
export function FloorLines({
  y0 = WALL_Y,
  vx = 800,
  vy = -260,
  n = 26,
  step = 150,
  stroke = "#000",
  opacity = 0.12,
  rows = 9,
  width = 1.4,
  clip,
}: {
  y0?: number;
  vx?: number;
  vy?: number;
  n?: number;
  step?: number;
  stroke?: string;
  opacity?: number;
  rows?: number;
  width?: number;
  clip?: string;
}) {
  const lines: ReactNode[] = [];
  for (let i = -n; i <= n; i++) {
    const xb = vx + i * step;
    const x0 = r2(vx + ((xb - vx) * (y0 - vy)) / (900 - vy));
    lines.push(<line key={`v${i}`} x1={x0} y1={y0} x2={xb} y2={900} />);
  }
  for (let k = 1; k < rows; k++) {
    const y = r2(y0 + (900 - y0) * Math.pow(k / rows, 1.8));
    lines.push(<line key={`h${k}`} x1={0} y1={y} x2={1600} y2={y} />);
  }
  return (
    <g stroke={stroke} strokeOpacity={opacity} strokeWidth={width} clipPath={clip}>
      {lines}
    </g>
  );
}

export function SkyWindow({
  uid,
  id,
  x,
  y,
  w,
  h,
  tod,
  frame = "#e8e2d6",
  frameW = 8,
  cols = 2,
  rows = 2,
  children,
  arch = false,
}: {
  uid: string;
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
  tod: TimeOfDay;
  frame?: string;
  frameW?: number;
  cols?: number;
  rows?: number;
  children?: ReactNode;
  arch?: boolean;
}) {
  const p = SKY[tod];
  const cid = `${uid}-wc-${id}`;
  const gid = `${uid}-wg-${id}`;
  const r = arch ? w / 2 : 0;
  const rnd = rng(w * 31 + h * 17 + x);
  const stars = p.stars
    ? Array.from({ length: 16 }, (_, i) => (
        <circle key={i} cx={rnd() * w} cy={rnd() * h * 0.7} r={0.7 + rnd() * 1.2} fill="#fff" opacity={0.5 + rnd() * 0.5} />
      ))
    : null;
  const clipPath = arch
    ? `M0,${h} L0,${r} A${r},${r} 0 0 1 ${w},${r} L${w},${h} Z`
    : `M0,0 H${w} V${h} H0 Z`;
  return (
    <g transform={`translate(${x} ${y})`}>
      <defs>
        <clipPath id={cid}>
          <path d={clipPath} />
        </clipPath>
        <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={p.top} />
          <stop offset="0.55" stopColor={p.mid} />
          <stop offset="1" stopColor={p.bottom} />
        </linearGradient>
      </defs>
      <g clipPath={`url(#${cid})`}>
        <rect width={w} height={h} fill={`url(#${gid})`} />
        {stars}
        {p.sun && (
          <g>
            <circle cx={w * p.sunX} cy={h * p.sunY} r={Math.min(w, h) * 0.32} fill={p.sun} opacity="0.25" />
            <circle cx={w * p.sunX} cy={h * p.sunY} r={Math.min(w, h) * 0.13} fill={p.sun} />
          </g>
        )}
        {p.moon && (
          <g>
            <circle cx={w * p.sunX} cy={h * p.sunY} r={Math.min(w, h) * 0.2} fill="#dfe8ff" opacity="0.14" />
            <circle cx={w * p.sunX} cy={h * p.sunY} r={Math.min(w, h) * 0.09} fill="#f4f1dc" />
            <circle cx={w * p.sunX + Math.min(w, h) * 0.04} cy={h * p.sunY - 2} r={Math.min(w, h) * 0.08} fill="#1b2650" opacity="0.18" />
          </g>
        )}
        {(tod === "day" || tod === "morning") && (
          <g fill="#fff" opacity="0.8">
            <ellipse cx={w * 0.3} cy={h * 0.25} rx={w * 0.14} ry={h * 0.05} />
            <ellipse cx={w * 0.38} cy={h * 0.22} rx={w * 0.09} ry={h * 0.05} />
          </g>
        )}
        {children}
        <path d={`M${w * 0.1},${h} L${w * 0.45},0 L${w * 0.6},0 L${w * 0.25},${h} Z`} fill="#fff" opacity="0.07" />
      </g>
      {/* frame + mullions */}
      <g fill="none" stroke={frame} strokeWidth={frameW} strokeLinejoin="round">
        {arch ? <path d={clipPath} /> : <rect x="0" y="0" width={w} height={h} />}
        {Array.from({ length: cols - 1 }, (_, i) => (
          <line key={`c${i}`} x1={(w * (i + 1)) / cols} y1={arch ? r : 0} x2={(w * (i + 1)) / cols} y2={h} strokeWidth={frameW * 0.6} />
        ))}
        {Array.from({ length: rows - 1 }, (_, i) => (
          <line key={`r${i}`} x1="0" y1={(h * (i + 1)) / rows} x2={w} y2={(h * (i + 1)) / rows} strokeWidth={frameW * 0.6} />
        ))}
      </g>
      <rect x={-frameW / 2} y={h} width={w + frameW} height={frameW * 1.4} fill={darken(frame, 0.08)} />
      <rect x={-frameW / 2} y={h} width={w + frameW} height="2" fill={lighten(frame, 0.4)} opacity="0.7" />
    </g>
  );
}

/** Hills / mountains / fields silhouette for windows (width w, height h, local coordinates). */
export function Landscape({ w, h, tod, fields = true }: { w: number; h: number; tod: TimeOfDay; fields?: boolean }) {
  const p = SKY[tod];
  return (
    <g>
      <path d={`M0,${h * 0.7} L${w * 0.18},${h * 0.38} L${w * 0.3},${h * 0.55} L${w * 0.5},${h * 0.28} L${w * 0.7},${h * 0.58} L${w * 0.85},${h * 0.42} L${w},${h * 0.6} L${w},${h} L0,${h} Z`} fill={p.far} />
      <path d={`M${w * 0.5},${h * 0.28} L${w * 0.44},${h * 0.4} L${w * 0.48},${h * 0.38} L${w * 0.52},${h * 0.42} L${w * 0.56},${h * 0.38} Z`} fill="#fff" opacity={tod === "night" ? 0.15 : 0.7} />
      <path d={`M0,${h * 0.78} Q${w * 0.25},${h * 0.62} ${w * 0.5},${h * 0.76} T${w},${h * 0.7} L${w},${h} L0,${h} Z`} fill={p.near} />
      {fields && (
        <g>
          <path d={`M0,${h * 0.86} L${w},${h * 0.8} L${w},${h} L0,${h} Z`} fill={p.field} />
          {Array.from({ length: 7 }, (_, i) => (
            <line key={i} x1={w * (0.08 + i * 0.15)} y1={h * 0.97} x2={w * (0.38 + i * 0.08)} y2={h * 0.83} stroke={darken(p.field, 0.22)} strokeWidth="2" opacity="0.5" />
          ))}
        </g>
      )}
    </g>
  );
}

/** City skyline silhouette in local window coordinates. */
export function Skyline({ w, h, tod }: { w: number; h: number; tod: TimeOfDay }) {
  const p = SKY[tod];
  const rnd = rng(77);
  const night = tod === "night" || tod === "evening";
  const far = Array.from({ length: 16 }, (_, i) => {
    const bw = w / 16;
    const bh = h * (0.25 + rnd() * 0.3);
    return <rect key={`f${i}`} x={i * bw} y={h - bh} width={bw + 1} height={bh} fill={p.far} opacity="0.8" />;
  });
  const near: ReactNode[] = [];
  let x = -10;
  let k = 0;
  while (x < w) {
    const bw = 40 + rnd() * 50;
    const bh = h * (0.3 + rnd() * 0.5);
    const shade = darken(p.near, 0.05 + rnd() * 0.1);
    near.push(<rect key={`n${k}`} x={x} y={h - bh} width={bw} height={bh} fill={shade} />);
    if (rnd() > 0.7) near.push(<rect key={`a${k}`} x={x + bw / 2 - 1} y={h - bh - 22} width="2" height="22" fill={shade} />);
    for (let wy = h - bh + 8; wy < h - 8; wy += 14) {
      for (let wx = x + 6; wx < x + bw - 8; wx += 12) {
        if (night) {
          if (rnd() > 0.5) near.push(<rect key={`w${k}-${wx}-${wy}`} x={wx} y={wy} width="5" height="7" fill="#ffe9a8" opacity={0.5 + rnd() * 0.5} />);
        } else if (rnd() > 0.6) {
          near.push(<rect key={`w${k}-${wx}-${wy}`} x={wx} y={wy} width="5" height="7" fill="#ffffff" opacity="0.28" />);
        }
      }
    }
    x += bw + 3;
    k++;
  }
  return (
    <g>
      {far}
      {near}
    </g>
  );
}

/** Light shafts from windows onto the floor. */
export function Shafts({ uid, polys }: { uid: string; polys: string[] }) {
  return (
    <g style={{ mixBlendMode: "screen" }}>
      {polys.map((d, i) => (
        <path key={i} d={d} fill={`url(#${uid}-shaft)`} />
      ))}
    </g>
  );
}

export function ShaftDefs({ uid, tod }: { uid: string; tod: TimeOfDay }) {
  const p = SKY[tod];
  return (
    <linearGradient id={`${uid}-shaft`} x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stopColor={p.shaft} stopOpacity={p.shaftOpacity} />
      <stop offset="1" stopColor={p.shaft} stopOpacity="0" />
    </linearGradient>
  );
}

export function Glow({ uid, id, cx, cy, rx, ry, color, opacity = 0.6 }: { uid: string; id: string; cx: number; cy: number; rx: number; ry: number; color: string; opacity?: number }) {
  return (
    <g>
      <defs>
        <radialGradient id={`${uid}-g-${id}`}>
          <stop offset="0" stopColor={color} stopOpacity={opacity} />
          <stop offset="1" stopColor={color} stopOpacity="0" />
        </radialGradient>
      </defs>
      <ellipse cx={cx} cy={cy} rx={rx} ry={ry} fill={`url(#${uid}-g-${id})`} />
    </g>
  );
}

export function AmbientOverlay({ tod }: { tod: TimeOfDay }) {
  const p = SKY[tod];
  if (!p.ambientOpacity) return null;
  return <rect width="1600" height="900" fill={p.ambient} opacity={p.ambientOpacity} style={{ mixBlendMode: "multiply" }} />;
}

export function Vignette({ uid, strength = 0.35 }: { uid: string; strength?: number }) {
  return (
    <g>
      <defs>
        <radialGradient id={`${uid}-vig`} cx="0.5" cy="0.55" r="0.75">
          <stop offset="0.55" stopColor="#000" stopOpacity="0" />
          <stop offset="1" stopColor="#000" stopOpacity={strength} />
        </radialGradient>
      </defs>
      <rect width="1600" height="900" fill={`url(#${uid}-vig)`} />
    </g>
  );
}

/** Board text fitted to a width using textLength. */
export function FitText({
  text,
  x,
  y,
  size,
  maxWidth,
  fill,
  weight = 700,
  anchor = "middle",
  opacity,
  font,
}: {
  text: string;
  x: number;
  y: number;
  size: number;
  maxWidth: number;
  fill: string;
  weight?: number;
  anchor?: "start" | "middle" | "end";
  opacity?: number;
  font?: string;
}) {
  let w = 0;
  for (const ch of text) w += ch.charCodeAt(0) > 0x2e80 ? size : size * 0.56;
  const fit = w > maxWidth;
  return (
    <text
      x={x}
      y={y}
      fontSize={size}
      fontWeight={weight}
      fill={fill}
      textAnchor={anchor}
      opacity={opacity}
      fontFamily={font}
      textLength={fit ? maxWidth : undefined}
      lengthAdjust={fit ? "spacingAndGlyphs" : undefined}
    >
      {text}
    </text>
  );
}
