import { TOWN_ARC } from "../seats";
import { r2 } from "../util";
import { AmbientOverlay, FitText, FloorLines, Glow, Landscape, ShaftDefs, Shafts, SkyWindow, Vignette, WALL_Y, type BackdropProps } from "./common";

export function TownhallBackdrop({ uid, tod, boardTitle, boardSubtitle }: BackdropProps) {
  const title = boardTitle || "〇〇市 タウンミーティング";
  const wins = [60, 330, 1030, 1300];
  return (
    <g>
      <defs>
        <ShaftDefs uid={uid} tod={tod} />
        <linearGradient id={`${uid}-wall`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#f3e8d0" />
          <stop offset="1" stopColor="#e4d3b0" />
        </linearGradient>
        <linearGradient id={`${uid}-floor`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#d9a964" />
          <stop offset="1" stopColor="#b57d3e" />
        </linearGradient>
        <linearGradient id={`${uid}-banner`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fffdf6" />
          <stop offset="1" stopColor="#f1ead6" />
        </linearGradient>
      </defs>
      <rect width="1600" height={WALL_Y + 4} fill={`url(#${uid}-wall)`} />
      {/* ceiling beam + lamps */}
      <rect width="1600" height="30" fill="#7a5530" />
      <rect y="26" width="1600" height="5" fill="#a67a48" />
      {[200, 600, 1000, 1400].map((x) => (
        <rect key={x} x={x - 80} y="31" width="160" height="8" rx="3" fill="#fffef0" />
      ))}
      {/* wainscot */}
      <rect y="278" width="1600" height="84" fill="#b88a58" />
      {Array.from({ length: 40 }, (_, i) => (
        <line key={i} x1={i * 40 + 20} y1="278" x2={i * 40 + 20} y2="362" stroke="#8d6538" strokeWidth="2" opacity="0.6" />
      ))}
      <rect y="274" width="1600" height="8" fill="#8d6538" />
      <rect y="274" width="1600" height="2" fill="#e8c28c" opacity="0.7" />

      {/* banner */}
      <g>
        <path d="M300,38 L300,64 M1300,38 L1300,64" stroke="#7a5530" strokeWidth="3" />
        <path d="M300,64 Q800,82 1300,64 L1300,168 Q800,186 300,168 Z" fill="#000" opacity="0.14" transform="translate(4 6)" />
        <path d="M300,64 Q800,82 1300,64 L1300,168 Q800,186 300,168 Z" fill={`url(#${uid}-banner)`} stroke="#c63a2e" strokeWidth="5" />
        <path d="M318,80 Q800,98 1282,80 L1282,152 Q800,170 318,152 Z" fill="none" stroke="#c63a2e" strokeWidth="1.5" opacity="0.6" />
        {[300, 1300].map((x) => (
          <g key={x}>
            <circle cx={x + (x < 800 ? 12 : -12)} cy="76" r="4" fill="#9aa3ae" />
            <circle cx={x + (x < 800 ? 12 : -12)} cy="158" r="4" fill="#9aa3ae" />
          </g>
        ))}
        <FitText text={title} x={800} y={134} size={56} maxWidth={880} fill="#1d2f5a" font='"Hiragino Mincho ProN","Noto Serif JP","Yu Mincho",serif' />
        {boardSubtitle && <FitText text={boardSubtitle} x={800} y={160} size={19} maxWidth={760} fill="#a8301f" weight={600} />}
      </g>

      {/* windows with mountains and fields */}
      {wins.map((x, i) => (
        <SkyWindow key={x} uid={uid} id={`w${i}`} x={x} y={186} w={240} h={150} tod={tod} frame="#f6f2e8" frameW={8} cols={3} rows={2}>
          <Landscape w={240} h={150} tod={tod} />
        </SkyWindow>
      ))}
      {/* clock + flags */}
      <g transform="translate(800 250)">
        <circle r="44" fill="#6a4a2a" />
        <circle r="38" fill="#fffdf4" />
        {Array.from({ length: 12 }, (_, i) => (
          <line key={i} y1="-33" y2={i % 3 === 0 ? -26 : -29} stroke="#333" strokeWidth={i % 3 === 0 ? 3 : 1.5} transform={`rotate(${i * 30})`} />
        ))}
        <path d="M0,0 L0,-24 M0,0 L16,6" stroke="#222" strokeWidth="3" strokeLinecap="round" />
        <circle r="3" fill="#c63a2e" />
      </g>
      {[660, 940].map((x, i) => (
        <g key={x} transform={`translate(${x} 0)`}>
          <rect x="-2" y="196" width="4" height="150" fill="#8a6a3a" />
          <path d={`M2,198 L${i ? 52 : 52},204 L52,248 L2,242 Z`} fill={i ? "#f4f1e6" : "#2f6fb0"} />
          <circle cx="27" cy="223" r="9" fill={i ? "#2c7d56" : "#fff"} />
        </g>
      ))}

      {/* floor */}
      <rect y={WALL_Y} width="1600" height={900 - WALL_Y} fill={`url(#${uid}-floor)`} />
      {Array.from({ length: 22 }, (_, k) => {
        const y = r2(WALL_Y + (900 - WALL_Y) * Math.pow((k + 1) / 22, 1.7));
        return <line key={k} x1="0" y1={y} x2="1600" y2={y} stroke="#6a4420" strokeOpacity="0.16" strokeWidth="1.2" />;
      })}
      <FloorLines rows={1} stroke="#6a4420" opacity={0.2} step={170} n={14} />
      <path d="M0,362 L1600,362 L1600,374 L0,374 Z" fill="#6a4420" opacity="0.25" />
      <Shafts
        uid={uid}
        polys={[
          "M60,336 L300,336 L520,900 L120,900 Z",
          "M330,336 L570,336 L860,900 L460,900 Z",
          "M1030,336 L1270,336 L1100,900 L780,900 Z",
          "M1300,336 L1540,336 L1500,900 L1160,900 Z",
        ]}
      />
      <Glow uid={uid} id="a" cx={800} cy={34} rx={760} ry={160} color="#fffbe0" opacity={0.5} />
      <Glow uid={uid} id="b" cx={800} cy={600} rx={800} ry={260} color="#ffe9b0" opacity={0.18} />
      <AmbientOverlay tod={tod} />
      <Vignette uid={uid} strength={0.22} />
    </g>
  );
}

export function TownhallTable({ uid }: { uid: string }) {
  const { cx, cy, rx, ry } = TOWN_ARC;
  const d = `M${cx - rx},${cy} A${rx},${ry} 0 0 1 ${cx + rx},${cy}`;
  return (
    <g>
      <defs>
        <linearGradient id={`${uid}-tt`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#f2e7cf" />
          <stop offset="1" stopColor="#d9c9a4" />
        </linearGradient>
      </defs>
      <path d={d} fill="none" stroke="#000" strokeOpacity="0.18" strokeWidth="76" strokeDasharray="168 12" transform="translate(0 30)" />
      <path d={d} fill="none" stroke="#7d5f3a" strokeWidth="68" strokeDasharray="168 12" transform="translate(0 16)" />
      <path d={d} fill="none" stroke="#c9b48a" strokeWidth="68" strokeDasharray="168 12" transform="translate(0 8)" />
      <path d={d} fill="none" stroke={`url(#${uid}-tt)`} strokeWidth="64" strokeDasharray="168 12" />
      <path d={d} fill="none" stroke="#fff" strokeOpacity="0.45" strokeWidth="6" strokeDasharray="168 12" transform="translate(0 -22)" />
    </g>
  );
}
