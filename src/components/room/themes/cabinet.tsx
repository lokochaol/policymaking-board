import { CABINET_TABLE } from "../seats";
import { AmbientOverlay, FitText, FloorLines, Glow, Landscape, ShaftDefs, Shafts, SkyWindow, Vignette, WALL_Y, type BackdropProps } from "./common";

function Drape({ x }: { x: number }) {
  return (
    <g>
      <path d={`M${x - 44},64 L${x + 8},64 C${x + 14},150 ${x - 2},250 ${x + 6},340 L${x - 46},340 Z`} fill="#8a1c24" />
      <path d={`M${x + 142},64 L${x + 194},64 L${x + 196},340 L${x + 144},340 C${x + 152},250 ${x + 136},150 ${x + 142},64 Z`} fill="#8a1c24" />
      {[-30, -18, -6, 156, 168, 180].map((dx) => (
        <path key={dx} d={`M${x + dx},68 L${x + dx + (dx < 0 ? 4 : -2)},338`} stroke="#4a0a10" strokeWidth="3" opacity="0.45" />
      ))}
      <path d={`M${x - 52},56 L${x + 202},56 L${x + 202},82 Q${x + 75},96 ${x - 52},82 Z`} fill="#a02a34" />
      <path d={`M${x - 52},56 L${x + 202},56`} stroke="#d4af37" strokeWidth="5" />
      <path d={`M${x - 52},84 Q${x + 75},98 ${x + 202},84`} stroke="#d4af37" strokeWidth="3" fill="none" />
      <circle cx={x + 8} cy="190" r="6" fill="#d4af37" />
      <circle cx={x + 142} cy="190" r="6" fill="#d4af37" />
    </g>
  );
}

function Chandelier({ uid }: { uid: string }) {
  const arms = [-150, -100, -52, 52, 100, 150];
  return (
    <g>
      <Glow uid={uid} id="chand" cx={800} cy={120} rx={460} ry={240} color="#ffdb8a" opacity={0.5} />
      <line x1="800" y1="0" x2="800" y2="56" stroke="#8a6a2a" strokeWidth="4" />
      <g transform="translate(800 70)">
        {arms.map((ax) => (
          <g key={ax}>
            <path d={`M0,10 Q${ax * 0.4},${46} ${ax},30`} stroke="#d4af37" strokeWidth="4.5" fill="none" strokeLinecap="round" />
            <rect x={ax - 5} y="10" width="10" height="20" fill="#f4e6b0" />
            <ellipse cx={ax} cy="6" rx="6" ry="9" fill="#fff6c8" />
            <ellipse cx={ax} cy="6" rx="12" ry="14" fill="#ffe08a" opacity="0.45" />
          </g>
        ))}
        <path d="M-36,0 L36,0 L24,22 L-24,22 Z" fill="#d4af37" stroke="#8a6a1a" />
        <ellipse cx="0" cy="26" rx="22" ry="6" fill="#e5bd45" />
        {[-22, -11, 0, 11, 22].map((dx) => (
          <g key={dx}>
            <path d={`M${dx},30 L${dx - 2.5},40 L${dx},50 L${dx + 2.5},40 Z`} fill="#eaf4ff" opacity="0.95" />
          </g>
        ))}
        <circle cx="0" cy="46" r="3" fill="#fff" />
      </g>
    </g>
  );
}

export function CabinetBackdrop({ uid, tod, boardTitle, boardSubtitle }: BackdropProps) {
  const title = boardTitle || "閣議";
  return (
    <g>
      <defs>
        <ShaftDefs uid={uid} tod={tod} />
        <linearGradient id={`${uid}-wall`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#3a2a22" />
          <stop offset="1" stopColor="#53392a" />
        </linearGradient>
        <linearGradient id={`${uid}-carpet`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#8f1d27" />
          <stop offset="1" stopColor="#65121a" />
        </linearGradient>
        <linearGradient id={`${uid}-floor`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#4a3020" />
          <stop offset="1" stopColor="#2a1a10" />
        </linearGradient>
        <pattern id={`${uid}-damask`} width="60" height="40" patternUnits="userSpaceOnUse">
          <path d="M30,4 C38,14 38,26 30,36 C22,26 22,14 30,4 Z" fill="none" stroke="#d4af37" strokeWidth="1.2" opacity="0.35" />
          <circle cx="0" cy="20" r="3" fill="#d4af37" opacity="0.25" />
          <circle cx="60" cy="20" r="3" fill="#d4af37" opacity="0.25" />
        </pattern>
        <linearGradient id={`${uid}-board`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#1c1612" />
          <stop offset="1" stopColor="#0e0b08" />
        </linearGradient>
      </defs>
      <rect width="1600" height={WALL_Y + 4} fill={`url(#${uid}-wall)`} />
      <rect y="0" width="1600" height="344" fill={`url(#${uid}-damask)`} opacity="0.7" />
      {/* wainscot */}
      <rect y="262" width="1600" height="100" fill="#3a2418" />
      {Array.from({ length: 12 }, (_, i) => (
        <g key={i}>
          <rect x={i * 140 + 14} y="276" width="112" height="72" rx="3" fill="#4d3020" stroke="#d4af37" strokeWidth="1.6" opacity="0.95" />
          <rect x={i * 140 + 24} y="284" width="92" height="56" fill="none" stroke="#25150c" strokeWidth="2" />
        </g>
      ))}
      <rect y="256" width="1600" height="10" fill="#d4af37" />
      <rect y="256" width="1600" height="3" fill="#fff0a8" opacity="0.6" />
      <rect y="0" width="1600" height="26" fill="#25150c" />
      <rect y="24" width="1600" height="5" fill="#d4af37" />

      {/* windows with drapes */}
      <SkyWindow uid={uid} id="l" x={110} y={100} w={150} h={236} tod={tod} frame="#d4af37" frameW={6} cols={2} rows={4} arch>
        <Landscape w={150} h={236} tod={tod} fields={false} />
      </SkyWindow>
      <SkyWindow uid={uid} id="r" x={1340} y={100} w={150} h={236} tod={tod} frame="#d4af37" frameW={6} cols={2} rows={4} arch>
        <Landscape w={150} h={236} tod={tod} fields={false} />
      </SkyWindow>
      <Drape x={110} />
      <Drape x={1340} />

      {/* portraits */}
      {[360, 1240].map((x, i) => (
        <g key={x} transform={`translate(${x} 130)`}>
          <rect x="-50" y="-60" width="100" height="130" rx="4" fill="#d4af37" />
          <rect x="-43" y="-53" width="86" height="116" rx="2" fill="#1d1511" />
          <ellipse cx="0" cy="-12" rx="18" ry="22" fill={i ? "#b98a6a" : "#c9a080"} />
          <path d="M-34,63 C-30,28 -14,20 0,20 C14,20 30,28 34,63 Z" fill={i ? "#233a5a" : "#2a2a30"} />
          <path d="M-18,-26 C-14,-40 14,-40 18,-26 C10,-32 -10,-32 -18,-26Z" fill={i ? "#3a3a3a" : "#d8d8d8"} />
        </g>
      ))}

      {/* flags + board */}
      {[540, 1060].map((x, i) => (
        <g key={x}>
          <rect x={x - 3} y="96" width="6" height="262" fill="#8a6a2a" />
          <circle cx={x} cy="92" r="7" fill="#e5bd45" />
          <path d={`M${x + 3},104 C${x + 28},96 ${x + 52},112 ${x + 80},104 L${x + 80},176 C${x + 52},184 ${x + 28},168 ${x + 3},176 Z`} fill={i ? "#f4f1e6" : "#8f1d27"} />
          <circle cx={x + 42} cy="140" r="16" fill={i ? "#8f1d27" : "#f4f1e6"} />
          <circle cx={x + 42} cy="140" r="8" fill={i ? "#f4f1e6" : "#8f1d27"} />
        </g>
      ))}
      <rect x="590" y="150" width="420" height="132" rx="6" fill="#d4af37" />
      <rect x="598" y="158" width="404" height="116" rx="3" fill={`url(#${uid}-board)`} />
      <rect x="606" y="166" width="388" height="100" rx="2" fill="none" stroke="#d4af37" strokeWidth="1" opacity="0.55" />
      <FitText text={title} x={800} y={214} size={34} maxWidth={360} fill="#f6e4a8" font='"Hiragino Mincho ProN","Noto Serif JP","Yu Mincho",serif' />
      {boardSubtitle && <FitText text={boardSubtitle} x={800} y={248} size={17} maxWidth={360} fill="#cdb878" weight={500} />}

      {/* floor */}
      <rect y={WALL_Y} width="1600" height={900 - WALL_Y} fill={`url(#${uid}-floor)`} />
      <FloorLines stroke="#000" opacity={0.2} step={90} n={30} rows={10} />
      <path d="M110,372 L1490,372 L1650,900 L-50,900 Z" fill={`url(#${uid}-carpet)`} />
      <path d="M110,372 L1490,372 L1650,900 L-50,900 Z" fill={`url(#${uid}-damask)`} opacity="0.6" />
      <path d="M156,384 L1444,384 L1596,900 L4,900 Z" fill="none" stroke="#d4af37" strokeWidth="4" opacity="0.8" />
      <path d="M180,394 L1420,394 L1566,900 L34,900 Z" fill="none" stroke="#d4af37" strokeWidth="1.4" opacity="0.6" />
      <ellipse cx="800" cy="650" rx="640" ry="196" fill="none" stroke="#d4af37" strokeWidth="2" opacity="0.5" />
      <ellipse cx="800" cy="650" rx="610" ry="178" fill="none" stroke="#d4af37" strokeWidth="1" opacity="0.4" strokeDasharray="10 8" />

      <Shafts uid={uid} polys={["M110,340 L260,340 L640,900 L260,900 Z", "M1340,340 L1490,340 L1340,900 L960,900 Z"]} />
      <Chandelier uid={uid} />
      <Glow uid={uid} id="floorlight" cx={800} cy={620} rx={780} ry={250} color="#ffd890" opacity={0.2} />
      <AmbientOverlay tod={tod} />
      <Vignette uid={uid} strength={0.5} />
    </g>
  );
}

export function CabinetTable({ uid }: { uid: string }) {
  const { cx, cy, rx, ry } = CABINET_TABLE;
  return (
    <g>
      <defs>
        <linearGradient id={`${uid}-top`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#7a3d24" />
          <stop offset="1" stopColor="#4d2214" />
        </linearGradient>
      </defs>
      <ellipse cx={cx} cy={cy + 52} rx={rx + 10} ry={ry + 6} fill="#000" opacity="0.3" />
      <ellipse cx={cx} cy={cy + 30} rx={rx} ry={ry} fill="#25100a" />
      <ellipse cx={cx} cy={cy + 18} rx={rx} ry={ry} fill="#3a1a10" />
      <ellipse cx={cx} cy={cy + 8} rx={rx} ry={ry} fill="#d4af37" />
      <ellipse cx={cx} cy={cy} rx={rx} ry={ry} fill={`url(#${uid}-top)`} />
      <ellipse cx={cx} cy={cy} rx={rx} ry={ry} fill="none" stroke="#e5bd45" strokeWidth="4" />
      <ellipse cx={cx} cy={cy} rx={rx - 24} ry={ry - 8} fill="none" stroke="#e5bd45" strokeWidth="1.5" opacity="0.7" />
      <ellipse cx={cx} cy={cy} rx={rx - 150} ry={ry - 44} fill="none" stroke="#e5bd45" strokeWidth="1.2" opacity="0.4" strokeDasharray="6 7" />
      <path d={`M${cx - 300},${cy - 80} Q${cx},${cy - 116} ${cx + 300},${cy - 80}`} fill="none" stroke="#fff" strokeWidth="12" opacity="0.14" strokeLinecap="round" />
      <g transform={`translate(${cx} ${cy})`} opacity="0.7">
        <circle r="26" fill="none" stroke="#e5bd45" strokeWidth="1.6" />
        {Array.from({ length: 8 }, (_, i) => (
          <path key={i} d="M0,-26 L0,-12" stroke="#e5bd45" strokeWidth="1.6" transform={`rotate(${i * 45})`} />
        ))}
        <circle r="6" fill="#e5bd45" />
      </g>
    </g>
  );
}
