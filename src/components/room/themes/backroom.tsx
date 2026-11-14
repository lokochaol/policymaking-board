import { ZA_TABLE } from "../seats";
import { AmbientOverlay, FitText, FloorLines, Glow, SKY, ShaftDefs, Shafts, Vignette, WALL_Y, rng, type BackdropProps, type TimeOfDay } from "./common";

const PAPER: Record<TimeOfDay, string> = { morning: "#fff1d2", day: "#fffdf6", evening: "#ffd9a8", night: "#c9d2f4" };

function Shoji({ x, y, w, h, tod, i }: { x: number; y: number; w: number; h: number; tod: TimeOfDay; i: number }) {
  const rnd = rng(i * 91 + 7);
  const paper = PAPER[tod];
  const night = tod === "night";
  return (
    <g transform={`translate(${x} ${y})`}>
      <rect width={w} height={h} fill="#2d1c10" />
      <rect x="6" y="6" width={w - 12} height={h - 12} fill={paper} />
      {/* outside silhouette: bamboo / moon */}
      <g opacity={night ? 0.5 : 0.28}>
        {night && <circle cx={w * 0.7} cy={h * 0.28} r="20" fill="#fffbe0" opacity="0.9" />}
        {[0.2, 0.38, 0.8].map((fx, k) => (
          <g key={k}>
            <rect x={w * fx - 3} y="6" width="6" height={h - 12} fill="#27402e" />
            {[0.2, 0.45, 0.7].map((fy, m) => (
              <path key={m} d={`M${w * fx},${h * fy} q${24 + rnd() * 10},-14 ${44 + rnd() * 10},-4 q-22,12 -44,4 Z`} fill="#27402e" />
            ))}
          </g>
        ))}
      </g>
      <rect x="6" y="6" width={w - 12} height={h - 12} fill={SKY[tod].lit ? "#ffb35c" : "#fff"} opacity={night ? 0.06 : 0.1} />
      {/* kumiko grid */}
      <g stroke="#3a2412" strokeWidth="3.2">
        {[1, 2, 3, 4, 5].map((k) => (
          <line key={`v${k}`} x1={(w * k) / 6} y1="6" x2={(w * k) / 6} y2={h - 6} />
        ))}
        {[1, 2, 3, 4].map((k) => (
          <line key={`h${k}`} x1="6" y1={6 + ((h - 70) * k) / 5} x2={w - 6} y2={6 + ((h - 70) * k) / 5} />
        ))}
      </g>
      <rect x="6" y={h - 64} width={w - 12} height="58" fill="#6c4526" />
      <rect x="14" y={h - 56} width={w - 28} height="42" fill="none" stroke="#8a5f38" strokeWidth="2" />
      <rect width={w} height={h} fill="none" stroke="#1f1208" strokeWidth="6" />
    </g>
  );
}

function Andon({ x, y, uid, id }: { x: number; y: number; uid: string; id: string }) {
  return (
    <g>
      <Glow uid={uid} id={id} cx={x} cy={y - 70} rx={240} ry={230} color="#ffb255" opacity={0.55} />
      <g transform={`translate(${x} ${y})`}>
        <ellipse cx="0" cy="4" rx="34" ry="8" fill="#000" opacity="0.3" />
        <rect x="-26" y="-6" width="52" height="8" fill="#2b190c" />
        <rect x="-23" y="-120" width="46" height="116" fill="#ffd690" />
        <rect x="-23" y="-120" width="46" height="116" fill="#fff4cf" opacity="0.5" />
        <g stroke="#2b190c" strokeWidth="4">
          <line x1="-23" y1="-120" x2="-23" y2="-6" />
          <line x1="23" y1="-120" x2="23" y2="-6" />
          <line x1="0" y1="-120" x2="0" y2="-6" strokeWidth="2.5" />
          <line x1="-23" y1="-66" x2="23" y2="-66" strokeWidth="2.5" />
        </g>
        <rect x="-28" y="-128" width="56" height="9" fill="#2b190c" />
        <rect x="-30" y="-134" width="60" height="7" fill="#3d2514" />
      </g>
    </g>
  );
}

export function BackroomBackdrop({ uid, tod, boardTitle, boardSubtitle }: BackdropProps) {
  const title = (boardTitle || "根回し").replace(/\s+/g, "").slice(0, 8);
  const sub = (boardSubtitle || "").replace(/\s+/g, "").slice(0, 8);
  return (
    <g>
      <defs>
        <ShaftDefs uid={uid} tod={tod} />
        <linearGradient id={`${uid}-wall`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#5b3a24" />
          <stop offset="1" stopColor="#7d5434" />
        </linearGradient>
        <linearGradient id={`${uid}-floor`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#a8ab6c" />
          <stop offset="1" stopColor="#8b8d52" />
        </linearGradient>
        <linearGradient id={`${uid}-toko`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#c8a878" />
          <stop offset="1" stopColor="#e4cfa4" />
        </linearGradient>
        <linearGradient id={`${uid}-scroll`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#f3ead2" />
          <stop offset="1" stopColor="#e4d8b8" />
        </linearGradient>
      </defs>
      <rect width="1600" height={WALL_Y + 4} fill={`url(#${uid}-wall)`} />
      {/* ceiling slats */}
      <rect width="1600" height="46" fill="#2a1a0e" />
      {Array.from({ length: 40 }, (_, i) => (
        <line key={i} x1={i * 40} y1="0" x2={i * 40} y2="46" stroke="#4a3018" strokeWidth="2" />
      ))}
      <rect y="42" width="1600" height="8" fill="#1f1208" />
      <rect y="42" width="1600" height="2" fill="#a0724a" opacity="0.6" />
      {/* tokonoma alcove */}
      <g>
        <rect x="100" y="70" width="440" height="282" fill="#2a1a0e" />
        <rect x="114" y="82" width="412" height="246" fill={`url(#${uid}-toko)`} />
        <rect x="114" y="82" width="412" height="246" fill="#000" opacity="0.2" />
        <rect x="114" y="328" width="412" height="30" fill="#3a2212" />
        <rect x="114" y="326" width="412" height="6" fill="#7a4f2c" />
        <rect x="114" y="326" width="412" height="2" fill="#c8a06a" opacity="0.7" />
        {/* hanging scroll */}
        <path d="M296,70 L296,92 M344,70 L344,92" stroke="#2a1a0e" strokeWidth="2" />
        <rect x="262" y="92" width="116" height="226" fill="#5a2e2a" />
        <rect x="268" y="98" width="104" height="214" fill="#c9a64a" opacity="0.9" />
        <rect x="276" y="106" width="88" height="198" fill={`url(#${uid}-scroll)`} />
        <rect x="256" y="90" width="128" height="6" rx="2" fill="#2a1a0e" />
        <rect x="256" y="314" width="128" height="8" rx="3" fill="#2a1a0e" />
        <circle cx="256" cy="318" r="5" fill="#6a4a2a" />
        <circle cx="384" cy="318" r="5" fill="#6a4a2a" />
        <text
          x={sub ? 332 : 320}
          y="124"
          fontSize={Math.min(34, 190 / Math.max(title.length, 1))}
          fontWeight="700"
          fill="#1e1a14"
          fontFamily='"Hiragino Mincho ProN","Noto Serif JP","Yu Mincho",serif'
          style={{ writingMode: "vertical-rl", textOrientation: "upright" }}
          textAnchor="start"
        >
          {title}
        </text>
        {sub && (
          <text x="298" y="150" fontSize="15" fill="#6a2a22" fontFamily='"Hiragino Mincho ProN","Noto Serif JP",serif' style={{ writingMode: "vertical-rl", textOrientation: "upright" }}>
            {sub}
          </text>
        )}
        <circle cx={sub ? 352 : 340} cy="284" r="7" fill="#c63a2e" opacity="0.85" />
        {/* ikebana */}
        <g transform="translate(456 326)">
          <path d="M-14,0 C-18,-26 -10,-40 -6,-46 L6,-46 C10,-40 18,-26 14,0 Z" fill="#244a6a" stroke="#14304a" strokeWidth="1.5" />
          <path d="M0,-46 C-6,-90 -22,-120 -40,-146" stroke="#4b6b3a" strokeWidth="3" fill="none" />
          <path d="M0,-46 C6,-84 26,-110 44,-122" stroke="#4b6b3a" strokeWidth="3" fill="none" />
          <path d="M0,-46 C0,-90 2,-130 4,-168" stroke="#7a4a2a" strokeWidth="3" fill="none" />
          <circle cx="-40" cy="-148" r="9" fill="#e86a8a" />
          <circle cx="46" cy="-123" r="8" fill="#f2b84a" />
          <circle cx="4" cy="-170" r="9" fill="#f6f1e8" />
          <circle cx="-34" cy="-136" r="5" fill="#e86a8a" opacity="0.8" />
        </g>
      </g>
      {/* tokobashira pillar */}
      <rect x="548" y="50" width="30" height="312" fill="#3a2212" />
      <rect x="548" y="50" width="6" height="312" fill="#7a5030" opacity="0.7" />

      {/* shoji */}
      {[0, 1, 2].map((i) => (
        <Shoji key={i} x={612 + i * 296} y={78} w={286} h={282} tod={tod} i={i} />
      ))}
      <rect x="600" y="62" width="900" height="18" fill="#2a1a0e" />
      <rect x="600" y="360" width="900" height="10" fill="#1f1208" />
      <Glow uid={uid} id="shoji" cx={1050} cy={260} rx={560} ry={200} color={tod === "night" ? "#9fb0f0" : "#fff1c8"} opacity={tod === "night" ? 0.28 : 0.35} />

      {/* floor: tatami */}
      <rect y={WALL_Y + 8} width="1600" height={900 - WALL_Y} fill={`url(#${uid}-floor)`} />
      <FloorLines y0={WALL_Y + 8} stroke="#4a4a22" opacity={0.5} step={230} n={9} rows={5} width={3} />
      <FloorLines y0={WALL_Y + 8} stroke="#d3d594" opacity={0.2} step={46} n={40} rows={1} width={1} />
      <rect y={WALL_Y} width="1600" height="12" fill="#2a1a0e" />
      <rect y={WALL_Y} width="1600" height="3" fill="#8a603a" opacity="0.7" />

      <Shafts uid={uid} polys={["M640,370 L900,370 L1000,900 L560,900 Z", "M936,370 L1196,370 L1380,900 L940,900 Z", "M1232,370 L1492,370 L1700,900 L1320,900 Z"]} />
      <Andon x={594} y={376} uid={uid} id="a1" />
      <Andon x={1522} y={376} uid={uid} id="a2" />
      <Glow uid={uid} id="warm" cx={800} cy={520} rx={800} ry={300} color="#ffb860" opacity={0.28} />
      <AmbientOverlay tod={tod} />
      <Vignette uid={uid} strength={0.55} />
    </g>
  );
}

export function BackroomTable({ uid }: { uid: string }) {
  return (
    <g>
      <defs>
        <linearGradient id={`${uid}-za`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#4a2c18" />
          <stop offset="1" stopColor="#6a4026" />
        </linearGradient>
      </defs>
      <path d={ZA_TABLE} fill="#000" opacity="0.3" transform="translate(0 40)" />
      <path d={ZA_TABLE} fill="#1f1208" transform="translate(0 24)" />
      <path d={ZA_TABLE} fill="#34200f" transform="translate(0 12)" />
      <path d={ZA_TABLE} fill={`url(#${uid}-za)`} />
      <path d={ZA_TABLE} fill="none" stroke="#9a6a40" strokeWidth="2" opacity="0.6" />
      <path d="M520,540 L800,530 L760,700 L470,708 Z" fill="#fff" opacity="0.07" />
      {/* runner */}
      <path d="M690,522 L910,522 L950,728 L650,728 Z" fill="#7d2630" opacity="0.9" />
      <path d="M700,522 L900,522 L936,728 L664,728 Z" fill="none" stroke="#d6b25a" strokeWidth="1.6" opacity="0.8" />
      {/* sake bottle + dishes */}
      <g transform="translate(800 612)">
        <ellipse cx="0" cy="12" rx="22" ry="6" fill="#000" opacity="0.3" />
        <path d="M-9,10 L-9,-14 C-9,-20 -4,-22 -3,-30 L3,-30 C4,-22 9,-20 9,-14 L9,10 Z" fill="#e8efe8" opacity="0.92" stroke="#b6c4b6" />
        <rect x="-3" y="-36" width="6" height="8" fill="#3a2212" />
        <ellipse cx="-42" cy="6" rx="14" ry="5" fill="#f4efe0" stroke="#c9bfa0" />
        <ellipse cx="46" cy="4" rx="15" ry="5.4" fill="#2f5a7a" stroke="#1f3f58" />
        <ellipse cx="46" cy="2" rx="9" ry="3" fill="#b8d2e6" />
      </g>
    </g>
  );
}
