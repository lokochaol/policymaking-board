import { ROUND_TABLE } from "../seats";
import { darken } from "../util";
import { AmbientOverlay, FitText, FloorLines, Glow, ShaftDefs, Shafts, Skyline, SkyWindow, Vignette, WALL_Y, type BackdropProps } from "./common";

function Plant({ x, y, s = 1 }: { x: number; y: number; s?: number }) {
  const leaves = [
    [-46, -62, -38, 34, 15],
    [-24, -96, -18, 42, 17],
    [0, -112, 0, 46, 18],
    [26, -94, 20, 42, 17],
    [48, -60, 40, 34, 15],
    [-10, -76, -8, 36, 14],
    [14, -72, 12, 34, 14],
  ];
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <ellipse cx="0" cy="6" rx="46" ry="10" fill="#000" opacity="0.2" />
      {leaves.map(([lx, ly, rot, rx, ry], i) => (
        <g key={i} transform={`translate(${lx} ${ly}) rotate(${rot})`}>
          <ellipse rx={rx * 0.5} ry={ry * 1.6} fill={i % 2 ? "#2f8a4f" : "#3da562"} />
          <path d={`M0,${-ry * 1.4} L0,${ry * 1.4}`} stroke="#1f6a3a" strokeWidth="1.6" opacity="0.6" />
        </g>
      ))}
      <path d="M-34,-6 L-28,32 L28,32 L34,-6 Z" fill="#e9e4da" stroke="#c4bcab" strokeWidth="1.5" />
      <ellipse cx="0" cy="-6" rx="34" ry="7" fill="#cfc8b8" />
      <ellipse cx="0" cy="-7" rx="30" ry="5" fill="#5a3b24" />
    </g>
  );
}

export function RoundtableBackdrop({ uid, tod, boardTitle, boardSubtitle }: BackdropProps) {
  const title = boardTitle || "円卓会議";
  const notes = [
    ["#ffe27a", 70, 104, -4], ["#ff9fb2", 126, 98, 3], ["#9fe0ff", 184, 108, -2], ["#b7f0a0", 244, 100, 5],
    ["#ffc27a", 82, 168, 4], ["#d7b8ff", 142, 176, -3], ["#ffe27a", 202, 170, 2], ["#9fe0ff", 258, 178, -5],
  ] as const;
  return (
    <g>
      <defs>
        <ShaftDefs uid={uid} tod={tod} />
        <linearGradient id={`${uid}-wall`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#f3f6fa" />
          <stop offset="1" stopColor="#d6dde8" />
        </linearGradient>
        <linearGradient id={`${uid}-floor`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#e2cfae" />
          <stop offset="1" stopColor="#bf9d6c" />
        </linearGradient>
        <linearGradient id={`${uid}-rug`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#3b6074" />
          <stop offset="1" stopColor="#274657" />
        </linearGradient>
      </defs>
      <rect width="1600" height={WALL_Y + 4} fill={`url(#${uid}-wall)`} />
      <rect width="1600" height="26" fill="#ffffff" />
      <rect y="26" width="1600" height="4" fill="#c4ccd8" />
      {/* LED strips */}
      {[260, 560, 860, 1160, 1400].map((x) => (
        <rect key={x} x={x} y="9" width="160" height="7" rx="3.5" fill="#fffbe8" />
      ))}

      {/* glass wall with skyline */}
      <SkyWindow uid={uid} id="glass" x={380} y={104} w={1160} h={236} tod={tod} frame="#aeb8c6" frameW={6} cols={6} rows={2}>
        <Skyline w={1160} h={236} tod={tod} />
      </SkyWindow>
      <rect x="376" y="100" width="1168" height="6" fill="#c9d1db" />
      {/* display bar */}
      <rect x="590" y="40" width="420" height="52" rx="8" fill="#171c28" stroke="#9aa5b6" strokeWidth="3" />
      <FitText text={title} x={800} y={67} size={25} maxWidth={380} fill="#f1f6ff" />
      {boardSubtitle && <FitText text={boardSubtitle} x={800} y={85} size={13} maxWidth={380} fill="#8fc2ff" weight={500} />}
      <circle cx="604" cy="66" r="3" fill="#47d98a" />

      {/* whiteboard */}
      <g>
        <rect x="46" y="76" width="300" height="218" rx="6" fill="#aab4c2" />
        <rect x="52" y="82" width="288" height="196" rx="3" fill="#fbfcfe" />
        <rect x="52" y="82" width="288" height="196" rx="3" fill="#cfe6ff" opacity="0.18" />
        <rect x="46" y="288" width="300" height="12" rx="4" fill="#8f9bab" />
        <rect x="70" y="284" width="26" height="6" rx="3" fill="#d6404f" />
        <rect x="104" y="284" width="26" height="6" rx="3" fill="#2f6fd4" />
        <path d="M70,96 Q100,84 150,94" stroke="#2f6fd4" strokeWidth="3" fill="none" strokeLinecap="round" />
        <path d="M70,138 L330,138" stroke="#c9d1db" strokeWidth="1.5" />
        <path d="M80,230 Q130,214 170,236 T260,226" stroke="#d6404f" strokeWidth="2.5" fill="none" strokeLinecap="round" />
        <path d="M250,260 L300,260 M250,266 L282,266" stroke="#2f6fd4" strokeWidth="2.5" strokeLinecap="round" />
        {notes.map(([c, nx, ny, r], i) => (
          <g key={i} transform={`rotate(${r} ${nx + 22} ${ny + 22})`}>
            <rect x={nx + 2} y={ny + 3} width="44" height="42" fill="#000" opacity="0.12" />
            <rect x={nx} y={ny} width="44" height="42" fill={c} />
            <path d={`M${nx + 7},${ny + 14} h28 M${nx + 7},${ny + 22} h22 M${nx + 7},${ny + 30} h26`} stroke="#000" strokeOpacity="0.28" strokeWidth="2" strokeLinecap="round" />
          </g>
        ))}
      </g>

      {/* floor */}
      <rect y={WALL_Y} width="1600" height={900 - WALL_Y} fill={`url(#${uid}-floor)`} />
      <FloorLines stroke="#6b4e2a" opacity={0.2} step={90} n={30} rows={14} />
      <ellipse cx="800" cy="650" rx="700" ry="205" fill={`url(#${uid}-rug)`} />
      <ellipse cx="800" cy="650" rx="676" ry="190" fill="none" stroke="#9fc4d6" strokeWidth="2" opacity="0.5" />
      <ellipse cx="800" cy="650" rx="640" ry="170" fill="none" stroke="#9fc4d6" strokeWidth="1" opacity="0.3" strokeDasharray="8 10" />
      <rect y={WALL_Y - 6} width="1600" height="12" fill="#b7bfcb" />
      <rect y={WALL_Y - 6} width="1600" height="3" fill="#fff" opacity="0.7" />

      <Shafts
        uid={uid}
        polys={[
          "M380,340 L760,340 L900,900 L420,900 Z",
          "M820,340 L1200,340 L1420,900 L960,900 Z",
          "M1240,340 L1540,340 L1700,900 L1480,900 Z",
        ]}
      />
      <Glow uid={uid} id="a" cx={800} cy={10} rx={620} ry={200} color="#fff7e0" opacity={0.55} />
      <Glow uid={uid} id="b" cx={800} cy={560} rx={760} ry={250} color="#ffffff" opacity={0.2} />
      <Plant x={150} y={470} s={1.15} />
      <Plant x={1470} y={462} s={1.1} />
      <AmbientOverlay tod={tod} />
      <Vignette uid={uid} strength={0.2} />
    </g>
  );
}

export function RoundtableTable({ uid }: { uid: string }) {
  const { cx, cy, rx, ry } = ROUND_TABLE;
  return (
    <g>
      <defs>
        <linearGradient id={`${uid}-top`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fbf8f2" />
          <stop offset="1" stopColor="#d7cdbd" />
        </linearGradient>
      </defs>
      <ellipse cx={cx} cy={cy + 40} rx={rx + 6} ry={ry + 4} fill="#000" opacity="0.18" />
      <ellipse cx={cx} cy={cy + 24} rx={rx} ry={ry} fill="#8f8574" />
      <ellipse cx={cx} cy={cy + 14} rx={rx} ry={ry} fill="#b3a893" />
      <ellipse cx={cx} cy={cy} rx={rx} ry={ry} fill={`url(#${uid}-top)`} />
      <ellipse cx={cx} cy={cy} rx={rx} ry={ry} fill="none" stroke="#fff" strokeWidth="3" opacity="0.8" />
      <ellipse cx={cx} cy={cy} rx={rx - 90} ry={ry - 26} fill="none" stroke="#b3a893" strokeWidth="1.5" opacity="0.6" />
      <path d={`M${cx - 330},${cy - 80} Q${cx},${cy - 118} ${cx + 330},${cy - 80}`} fill="none" stroke="#fff" strokeWidth="14" opacity="0.5" strokeLinecap="round" />
      <ellipse cx={cx} cy={cy + 6} rx="70" ry="16" fill="#2b3340" />
      <ellipse cx={cx} cy={cy + 2} rx="70" ry="16" fill="#3b4556" />
      <ellipse cx={cx} cy={cy} rx="30" ry="6" fill="#6f7b92" />
      <ellipse cx={cx} cy={cy} rx="12" ry="3" fill="#c6d4ee" />
      <path d={`M${cx - 340},${cy + 60} L${cx - 200},${cy + 100}`} stroke={darken("#d7cdbd", 0.1)} strokeWidth="1" opacity="0.4" />
    </g>
  );
}
