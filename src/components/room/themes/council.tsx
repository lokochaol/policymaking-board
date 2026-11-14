import { COUNCIL_U } from "../seats";
import { darken, lighten } from "../util";
import {
  AmbientOverlay,
  FitText,
  FloorLines,
  Glow,
  Landscape,
  ShaftDefs,
  Shafts,
  SkyWindow,
  Vignette,
  WALL_Y,
  type BackdropProps,
} from "./common";

function Flag({ x, kind }: { x: number; kind: "nation" | "ministry" }) {
  const nation = kind === "nation";
  return (
    <g transform={`translate(${x} 0)`}>
      <rect x="-3" y="62" width="6" height="296" fill="#6a5528" />
      <rect x="-3" y="62" width="2" height="296" fill="#e5cf86" opacity="0.7" />
      <circle cx="0" cy="58" r="7" fill="#e5bd45" stroke="#9a7420" />
      <g transform="translate(3 72)">
        <path d="M0,0 C30,-8 60,10 96,0 L96,96 C60,106 30,88 0,96 Z" fill={nation ? "#1f3a78" : "#f4f1e6"} />
        <path d="M0,0 C30,-8 60,10 96,0 L96,12 C60,22 30,4 0,12 Z" fill="#000" opacity="0.07" />
        {nation ? (
          <g transform="translate(48 48)">
            <circle r="24" fill="#f4e2a0" />
            <circle r="17" fill="#d8a62c" />
            {Array.from({ length: 12 }, (_, i) => (
              <path key={i} d="M0,-26 L3,-34 L-3,-34 Z" fill="#f4e2a0" transform={`rotate(${i * 30})`} />
            ))}
            <path d="M-10,4 Q0,-12 10,4 Q0,0 -10,4 Z" fill="#1f3a78" />
          </g>
        ) : (
          <g transform="translate(48 48)">
            <circle r="26" fill="none" stroke="#2c7d56" strokeWidth="4" />
            <path d="M-18,6 Q-9,-8 0,6 T18,6" fill="none" stroke="#2c7d56" strokeWidth="4" strokeLinecap="round" />
            <path d="M-14,16 Q-7,6 0,16 T14,16" fill="none" stroke="#2c7d56" strokeWidth="3" strokeLinecap="round" />
            <circle cy="-10" r="5" fill="#c9a24a" />
          </g>
        )}
        <path d="M0,0 C30,-8 60,10 96,0" fill="none" stroke="#fff" strokeOpacity="0.3" />
      </g>
    </g>
  );
}

export function CouncilBackdrop({ uid, tod, boardTitle, boardSubtitle }: BackdropProps) {
  const title = boardTitle || "審議会";
  return (
    <g>
      <defs>
        <ShaftDefs uid={uid} tod={tod} />
        <linearGradient id={`${uid}-wall`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#4a2f1d" />
          <stop offset="1" stopColor="#6b4529" />
        </linearGradient>
        <linearGradient id={`${uid}-panel`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#85583a" />
          <stop offset="1" stopColor="#5f3c24" />
        </linearGradient>
        <linearGradient id={`${uid}-carpet`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#1b4d36" />
          <stop offset="1" stopColor="#12382a" />
        </linearGradient>
        <linearGradient id={`${uid}-floor`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#4a3220" />
          <stop offset="1" stopColor="#2b1c12" />
        </linearGradient>
        <linearGradient id={`${uid}-screen`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#14284f" />
          <stop offset="1" stopColor="#0a1530" />
        </linearGradient>
        <pattern id={`${uid}-diamond`} width="46" height="28" patternUnits="userSpaceOnUse">
          <path d="M23,2 L42,14 L23,26 L4,14 Z" fill="none" stroke="#3f9a6c" strokeWidth="1.3" opacity="0.35" />
        </pattern>
      </defs>

      {/* wall */}
      <rect width="1600" height={WALL_Y + 4} fill={`url(#${uid}-wall)`} />
      {Array.from({ length: 16 }, (_, i) => (
        <g key={i}>
          <rect x={i * 100 + 6} y="62" width="88" height="170" rx="3" fill={`url(#${uid}-panel)`} stroke="#3a2212" strokeWidth="2" />
          <rect x={i * 100 + 16} y="72" width="68" height="150" rx="2" fill="none" stroke="#a6774f" strokeWidth="1.2" opacity="0.5" />
          <rect x={i * 100 + 6} y="252" width="88" height="96" rx="3" fill={`url(#${uid}-panel)`} stroke="#3a2212" strokeWidth="2" />
        </g>
      ))}
      <rect y="236" width="1600" height="14" fill="#3a2212" />
      <rect y="236" width="1600" height="3" fill="#b98757" opacity="0.7" />
      <rect y="0" width="1600" height="30" fill="#2e1b0f" />
      <rect y="26" width="1600" height="5" fill="#d4af37" opacity="0.8" />
      <rect y="346" width="1600" height="16" fill="#2e1b0f" />
      <rect y="346" width="1600" height="3" fill="#c79a5b" opacity="0.8" />

      {/* windows */}
      <SkyWindow uid={uid} id="l" x={92} y={92} w={150} h={210} tod={tod} frame="#d9cdb4" cols={2} rows={3}>
        <Landscape w={150} h={210} tod={tod} fields={false} />
      </SkyWindow>
      <SkyWindow uid={uid} id="r" x={1358} y={92} w={150} h={210} tod={tod} frame="#d9cdb4" cols={2} rows={3}>
        <Landscape w={150} h={210} tod={tod} fields={false} />
      </SkyWindow>
      {[92, 1358].map((x) => (
        <g key={x}>
          <path d={`M${x - 36},70 L${x + 2},70 L${x - 6},330 L${x - 40},330 Z`} fill="#1f5a3c" />
          <path d={`M${x + 148},70 L${x + 186},70 L${x + 190},330 L${x + 156},330 Z`} fill="#1f5a3c" />
          <path d={`M${x - 36},70 L${x + 186},70 L${x + 186},86 L${x - 36},86 Z`} fill="#c9a24a" />
          <path d={`M${x - 24},90 L${x - 22},320 M${x - 12},90 L${x - 14},320 M${x + 160},90 L${x + 162},320 M${x + 172},90 L${x + 174},320`} stroke="#0f3a25" strokeWidth="2" opacity="0.5" />
        </g>
      ))}

      {/* emblem + screen */}
      <g transform="translate(800 52)">
        <circle r="19" fill="#c9a24a" stroke="#7a5a1c" strokeWidth="2" />
        <circle r="14" fill="#2b2418" />
        <path d="M0,-10 L3,-3 L10,-3 L4.5,2 L6.5,9 L0,5 L-6.5,9 L-4.5,2 L-10,-3 L-3,-3 Z" fill="#e5bd45" />
        <path d="M-17,6 Q-20,-10 -8,-17 M17,6 Q20,-10 8,-17" fill="none" stroke="#e5bd45" strokeWidth="2" />
      </g>
      <Flag x={470} kind="nation" />
      <Flag x={1070} kind="ministry" />
      <rect x="548" y="82" width="504" height="160" rx="8" fill="#1a1208" stroke="#c9a24a" strokeWidth="4" />
      <rect x="560" y="94" width="480" height="136" rx="4" fill={`url(#${uid}-screen)`} />
      <rect x="560" y="94" width="480" height="136" rx="4" fill="#5aa0ff" opacity="0.06" />
      <path d="M560,94 L760,94 L700,230 L560,230 Z" fill="#fff" opacity="0.04" />
      <FitText text={title} x={800} y={158} size={38} maxWidth={440} fill="#f4f8ff" />
      {boardSubtitle && <FitText text={boardSubtitle} x={800} y={200} size={20} maxWidth={430} fill="#9cc6ff" weight={500} />}
      <rect x="578" y="108" width="40" height="3" fill="#5aa0ff" opacity="0.6" />

      {/* floor */}
      <rect y={WALL_Y} width="1600" height={900 - WALL_Y} fill={`url(#${uid}-floor)`} />
      <FloorLines stroke="#000" opacity={0.18} step={110} />
      <path d="M150,372 L1450,372 L1640,900 L-40,900 Z" fill={`url(#${uid}-carpet)`} />
      <path d="M150,372 L1450,372 L1640,900 L-40,900 Z" fill={`url(#${uid}-diamond)`} />
      <path d="M190,384 L1410,384 L1582,900 L18,900 Z" fill="none" stroke="#d4af37" strokeWidth="3" opacity="0.75" />
      <path d="M212,392 L1388,392 L1558,900 L42,900 Z" fill="none" stroke="#d4af37" strokeWidth="1.2" opacity="0.5" />
      <FloorLines stroke="#000" opacity={0.1} step={150} clip={undefined} />

      <Shafts
        uid={uid}
        polys={[
          "M92,302 L242,302 L640,900 L260,900 Z",
          "M1358,302 L1508,302 L1340,900 L960,900 Z",
        ]}
      />
      <Glow uid={uid} id="c1" cx={400} cy={20} rx={300} ry={190} color="#ffe2a8" opacity={0.5} />
      <Glow uid={uid} id="c2" cx={1200} cy={20} rx={300} ry={190} color="#ffe2a8" opacity={0.5} />
      <Glow uid={uid} id="c3" cx={800} cy={420} rx={640} ry={200} color="#ffe9c0" opacity={0.2} />
      {[400, 800, 1200].map((x) => (
        <g key={x}>
          <rect x={x - 52} y="31" width="104" height="9" rx="4" fill="#fff3d0" />
          <rect x={x - 52} y="31" width="104" height="9" rx="4" fill="#fff" opacity="0.6" />
        </g>
      ))}
      <AmbientOverlay tod={tod} />
      <Vignette uid={uid} strength={0.4} />
    </g>
  );
}

export function CouncilTable({ uid }: { uid: string }) {
  return (
    <g>
      <defs>
        <linearGradient id={`${uid}-ttop`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#9a6a42" />
          <stop offset="1" stopColor="#6e4527" />
        </linearGradient>
        <linearGradient id={`${uid}-tsheen`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#fff" stopOpacity="0" />
          <stop offset="0.5" stopColor="#fff" stopOpacity="0.2" />
          <stop offset="1" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={COUNCIL_U} fill="#1a0e06" opacity="0.35" transform="translate(0 34)" />
      <path d={COUNCIL_U} fill="#3a2112" transform="translate(0 18)" />
      <path d={COUNCIL_U} fill="#52321c" transform="translate(0 9)" />
      <path d={COUNCIL_U} fill={`url(#${uid}-ttop)`} />
      <path d={COUNCIL_U} fill="none" stroke="#c99660" strokeWidth="2.5" opacity="0.7" />
      <path d="M1106,548 L494,548" stroke="#c99660" strokeWidth="2" opacity="0.6" />
      <path d={COUNCIL_U} fill={`url(#${uid}-tsheen)`} />
      <ellipse cx="800" cy="438" rx="330" ry="9" fill="#fff" opacity="0.14" />
      <path d="M1140,700 L1190,860 L1210,860 L1170,700 Z M460,700 L410,860 L390,860 L430,700 Z" fill="#fff" opacity="0.08" />
    </g>
  );
}
