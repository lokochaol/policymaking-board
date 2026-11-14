import type { ReactNode } from "react";
import type { AvatarSpec, Outfit, Participant } from "@/lib/types";
import type { AvatarProps, Expression } from "./types";
import { darken, hash, lighten, mix } from "./util";
import styles from "./room.module.css";

/** Avatar design box: 120 x 150, origin top-left, bottom-center is the seat anchor. */
export const AVATAR_W = 120;
export const AVATAR_H = 150;

const SKINS = ["#fbe4d3", "#f6d1b1", "#e9b88c", "#c98f62", "#a46b42", "#6e4527"];
const INK = "#2a2018";

const TORSO = "M5,150 C5,119 18,100 42,94 L78,94 C102,100 115,119 115,150 Z";

function luminance(hex: string): number {
  const c = mix(hex, "#000000", 0);
  const n = parseInt(c.slice(1), 16);
  return (0.299 * ((n >> 16) & 255) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) / 255;
}

function hairColorFor(spec: AvatarSpec): string {
  const age = spec.age;
  const t = age >= 70 ? 0.8 : age >= 60 ? 0.55 : age >= 50 ? 0.22 : age >= 45 ? 0.08 : 0;
  return t > 0 ? mix(spec.hairColor, "#dcdce0", t) : spec.hairColor;
}

// ---------------------------------------------------------------- hair

function Hair({ style, color, part }: { style: number; color: string; part: "back" | "front" }) {
  const hi = lighten(color, 0.3);
  const lo = darken(color, 0.25);
  const s = ((style % 8) + 8) % 8;
  if (part === "back") {
    switch (s) {
      case 3:
        return (
          <path d="M31,44 C26,16 46,10 60,10 C76,10 96,16 89,44 L92,80 C92,87 83,87 80,80 L40,80 C37,87 28,87 28,80 Z" fill={color} />
        );
      case 4:
        return (
          <path d="M30,46 C24,14 46,9 60,9 C74,9 96,14 90,46 L97,106 C97,114 83,114 81,104 L79,60 L41,60 L39,104 C37,114 23,114 23,106 Z" fill={color} />
        );
      case 5:
        return (
          <g>
            <path d="M76,28 C108,22 116,66 100,100 C98,84 92,70 82,58 Z" fill={color} />
            <path d="M80,30 C100,34 106,58 98,80" fill="none" stroke={hi} strokeWidth="1.4" opacity="0.4" />
          </g>
        );
      case 6:
        return (
          <g>
            <circle cx="60" cy="12" r="13" fill={color} />
            <path d="M52,8 Q60,2 68,8" fill="none" stroke={hi} strokeWidth="1.4" opacity="0.45" />
          </g>
        );
      case 7:
        return <path d="M33,54 C28,34 38,24 50,22 L70,22 C82,24 92,34 87,54 L84,60 L36,60 Z" fill={color} opacity="0" />;
      default:
        return null;
    }
  }
  // front part
  switch (s) {
    case 0:
      return (
        <g>
          <path d="M33,50 C29,22 46,13 60,13 C76,13 91,22 87,50 C84,42 80,36 74,33 C66,38 50,38 44,32 C38,37 34,43 33,50 Z" fill={color} />
          <path d="M42,22 Q60,12 78,22" fill="none" stroke={hi} strokeWidth="1.6" opacity="0.4" />
        </g>
      );
    case 1:
      return (
        <g>
          <path d="M32,52 C27,22 44,12 62,13 C80,14 93,27 88,52 C86,44 83,38 78,34 C70,30 58,29 48,32 C42,36 38,42 36,50 Z" fill={color} />
          <path d="M48,16 C60,22 78,28 88,46 L88,52 C84,40 70,31 48,16 Z" fill={lo} opacity="0.6" />
          <path d="M48,16 Q45,26 39,36" fill="none" stroke={lo} strokeWidth="1.4" />
          <path d="M42,21 Q58,12 78,21" fill="none" stroke={hi} strokeWidth="1.6" opacity="0.4" />
        </g>
      );
    case 2:
      return (
        <path d="M34,44 C32,27 44,20 60,20 C76,20 88,27 86,44 C82,35 72,29 60,29 C48,29 38,35 34,44 Z" fill={color} opacity="0.82" />
      );
    case 3:
      return (
        <g>
          <path d="M33,48 C31,21 46,14 60,14 C74,14 89,21 87,48 L85,41 C74,34 46,34 35,41 Z" fill={color} />
          <path d="M42,21 Q60,12 78,21" fill="none" stroke={hi} strokeWidth="1.6" opacity="0.4" />
        </g>
      );
    case 4:
      return (
        <g>
          <path d="M32,52 C28,21 45,12 60,12 C75,12 92,21 88,52 C85,40 77,32 64,29 C54,34 42,40 32,52 Z" fill={color} />
          <path d="M34,54 L30,100 C30,108 38,109 41,100 L43,62 Z" fill={color} />
          <path d="M86,54 L90,100 C90,108 82,109 79,100 L77,62 Z" fill={color} />
          <path d="M64,29 Q60,20 62,13" fill="none" stroke={lo} strokeWidth="1.2" />
          <path d="M42,21 Q60,11 78,21" fill="none" stroke={hi} strokeWidth="1.6" opacity="0.4" />
        </g>
      );
    case 5:
      return (
        <g>
          <path d="M33,50 C29,22 46,13 60,13 C76,13 91,22 87,50 C84,42 80,36 74,33 C66,38 50,38 44,32 C38,37 34,43 33,50 Z" fill={color} />
          <circle cx="85" cy="33" r="3.6" fill="#d94f5c" />
          <path d="M42,22 Q60,12 78,22" fill="none" stroke={hi} strokeWidth="1.6" opacity="0.4" />
        </g>
      );
    case 6:
      return (
        <g>
          <path d="M33,50 C30,24 46,17 60,17 C75,17 90,24 87,50 C84,40 76,33 60,32 C44,33 36,40 33,50 Z" fill={color} />
          <path d="M42,25 Q60,16 78,25" fill="none" stroke={hi} strokeWidth="1.6" opacity="0.4" />
        </g>
      );
    default:
      return (
        <g>
          <path d="M34,54 C30,42 33,31 38,26 C38,34 38,45 40,55 Z" fill={color} />
          <path d="M86,54 C90,42 87,31 82,26 C82,34 82,45 80,55 Z" fill={color} />
          <path d="M42,26 Q58,17 78,26" fill="none" stroke={color} strokeWidth="1.2" opacity="0.7" />
          <ellipse cx="53" cy="27" rx="8" ry="3.6" fill="#ffffff" opacity="0.22" />
        </g>
      );
  }
}

// ---------------------------------------------------------------- outfits

interface OutfitCtx {
  c: string;
  cd: string;
  cl: string;
  skin: string;
  gender: "male" | "female";
  accessory: AvatarSpec["accessory"];
}

function Shade() {
  return <path d="M62,94 L78,94 C102,100 115,119 115,150 L66,150 Z" fill="#000" opacity="0.07" />;
}

function Buttons({ ys, x = 60, fill = "#e8c64e" }: { ys: number[]; x?: number; fill?: string }) {
  return (
    <g>
      {ys.map((y) => (
        <circle key={y} cx={x} cy={y} r="2.3" fill={fill} stroke={darken(fill, 0.3)} strokeWidth="0.6" />
      ))}
    </g>
  );
}

function outfitParts(outfit: Outfit, x: OutfitCtx): { body: ReactNode; top: ReactNode } {
  const { c, cd, cl, skin, gender } = x;
  const female = gender === "female";
  const tieColor = luminance(c) < 0.38 ? "#b8323f" : "#243b6b";
  switch (outfit) {
    case "school_uniform_jhs":
      if (female) {
        const shirt = "#f6f7fb";
        return {
          body: (
            <g>
              <path d={TORSO} fill={shirt} />
              <Shade />
            </g>
          ),
          top: (
            <g>
              <path d="M28,104 C36,93 46,91 50,91 L60,114 L70,91 C74,91 84,93 92,104 L82,128 L60,110 L38,128 Z" fill={c} />
              <path d="M33,106 L41,121 M36,102 L44,117" stroke="#fff" strokeWidth="1.6" fill="none" />
              <path d="M87,106 L79,121 M84,102 L76,117" stroke="#fff" strokeWidth="1.6" fill="none" />
              <path d="M50,92 L60,114 L70,92" fill={skin} opacity="0" />
              <path d="M60,112 L47,106 L49,122 Z" fill="#d6404f" />
              <path d="M60,112 L73,106 L71,122 Z" fill="#d6404f" />
              <path d="M60,112 L52,126 L58,132 Z" fill="#c1303f" />
              <path d="M60,112 L68,126 L62,132 Z" fill="#c1303f" />
              <circle cx="60" cy="112" r="3.4" fill="#a82533" />
            </g>
          ),
        };
      }
      return {
        body: (
          <g>
            <path d={TORSO} fill={c} />
            <Shade />
          </g>
        ),
        top: (
          <g>
            <path d="M46,82 L46,96 C52,100 56,100 60,101 C64,100 68,100 74,96 L74,82 L66,86 L54,86 Z" fill={cd} />
            <path d="M60,101 L60,150" stroke={darken(c, 0.35)} strokeWidth="1.2" />
            <Buttons ys={[110, 122, 134, 146]} />
            <circle cx="50" cy="93" r="2.4" fill="#e8c64e" />
            <circle cx="70" cy="93" r="2.4" fill="#e8c64e" />
            <path d="M22,126 L38,126 L38,138 L22,138 Z" fill={darken(c, 0.18)} opacity="0.7" />
          </g>
        ),
      };
    case "school_uniform_hs":
      return {
        body: (
          <g>
            <path d={TORSO} fill={c} />
            <Shade />
          </g>
        ),
        top: (
          <g>
            <path d="M47,92 L60,124 L73,92 Z" fill="#f6f7fb" />
            <path d="M44,92 L58,128 L47,140 L30,110 Z" fill={cd} />
            <path d="M76,92 L62,128 L73,140 L90,110 Z" fill={cd} />
            {female ? (
              <g>
                <path d="M60,106 L48,101 L49,115 Z" fill="#d6404f" />
                <path d="M60,106 L72,101 L71,115 Z" fill="#d6404f" />
                <path d="M60,106 L55,121 L60,124 Z" fill="#b82f3e" />
                <circle cx="60" cy="106" r="3" fill="#a82533" />
              </g>
            ) : (
              <g>
                <path d="M56,98 L64,98 L62,104 L58,104 Z" fill="#8a2b36" />
                <path d="M58,104 L62,104 L66,134 L60,140 L54,134 Z" fill="#b8323f" />
                <path d="M57,118 L63,114 M56,126 L64,122" stroke="#f2e1b0" strokeWidth="1.2" />
              </g>
            )}
            <rect x="82" y="120" width="13" height="15" rx="2" fill="#f2e1b0" stroke="#b48a36" strokeWidth="1" />
            <circle cx="88.5" cy="127.5" r="3.4" fill={cd} />
          </g>
        ),
      };
    case "casual":
      return {
        body: (
          <g>
            <path d={TORSO} fill={c} />
            <Shade />
          </g>
        ),
        top: (
          <g>
            <path d="M46,93 Q60,113 74,93 Z" fill={skin} />
            <path d="M46,93 Q60,113 74,93" fill="none" stroke={cd} strokeWidth="3" strokeLinecap="round" />
            <circle cx="60" cy="130" r="9" fill={cl} opacity="0.55" />
            <path d="M60,124 L62,129 L67,129 L63,132 L65,137 L60,134 L55,137 L57,132 L53,129 L58,129 Z" fill="#fff" opacity="0.8" />
          </g>
        ),
      };
    case "suit":
    case "suit_formal": {
      const formal = outfit === "suit_formal";
      const jc = formal ? darken(c, 0.32) : c;
      const jd = darken(jc, 0.22);
      const tc = formal ? (female ? "#c9a24a" : "#1d2c55") : tieColor;
      return {
        body: (
          <g>
            <path d={TORSO} fill={jc} />
            <Shade />
          </g>
        ),
        top: (
          <g>
            <path d="M47,92 L60,126 L73,92 Z" fill="#f6f7fb" />
            <path d="M43,92 L58,130 L46,142 L28,112 Z" fill={jd} />
            <path d="M77,92 L62,130 L74,142 L92,112 Z" fill={jd} />
            <path d="M43,92 L58,130" stroke={lighten(jc, 0.2)} strokeWidth="0.8" fill="none" opacity="0.6" />
            {female && !formal ? (
              <path d="M52,94 L60,112 L68,94 Z" fill={mix(tc, "#fff", 0.5)} />
            ) : (
              <g>
                <path d="M56,95 L64,95 L62,101 L58,101 Z" fill={darken(tc, 0.2)} />
                <path d="M58,101 L62,101 L66,132 L60,139 L54,132 Z" fill={tc} />
                <path d="M57.5,112 L62.5,108" stroke="#fff" strokeWidth="0.8" opacity="0.4" />
              </g>
            )}
            {formal && (
              <g>
                <circle cx="82" cy="115" r="5.2" fill="#e5bd45" stroke="#9a7420" strokeWidth="0.8" />
                <circle cx="82" cy="115" r="2.4" fill="#b8323f" />
                {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
                  <path key={i} d="M82,115 L82,108.6" stroke="#9a7420" strokeWidth="0.6" transform={`rotate(${i * 45} 82 115)`} />
                ))}
              </g>
            )}
            {!formal && <path d="M32,126 L42,124 L42,128 L32,129 Z" fill="#fff" opacity="0.85" />}
          </g>
        ),
      };
    }
    case "office_casual":
      return {
        body: (
          <g>
            <path d={TORSO} fill={c} />
            <Shade />
          </g>
        ),
        top: (
          <g>
            <path d="M52,92 L60,110 L68,92 Z" fill={skin} />
            <path d="M44,91 L58,112 L50,120 L38,100 Z" fill={cl} />
            <path d="M76,91 L62,112 L70,120 L82,100 Z" fill={cl} />
            <path d="M60,112 L60,150" stroke={darken(c, 0.2)} strokeWidth="1" />
            <Buttons ys={[122, 134, 146]} fill="#f3f3f3" />
            <rect x="78" y="118" width="16" height="14" rx="2" fill={darken(c, 0.1)} stroke={darken(c, 0.25)} strokeWidth="0.8" />
            <path d="M83,118 L83,111" stroke="#2f5fb3" strokeWidth="2" strokeLinecap="round" />
          </g>
        ),
      };
    case "uniform_driver": {
      const jc = darken(c, 0.05);
      return {
        body: (
          <g>
            <path d={TORSO} fill={jc} />
            <Shade />
          </g>
        ),
        top: (
          <g>
            <path d="M47,92 L60,118 L73,92 Z" fill="#dfe9f4" />
            <path d="M43,92 L56,122 L44,136 L28,110 Z" fill={darken(jc, 0.18)} />
            <path d="M77,92 L64,122 L76,136 L92,110 Z" fill={darken(jc, 0.18)} />
            <path d="M57,96 L63,96 L61,100 L59,100 Z" fill="#26324a" />
            <path d="M59,100 L61,100 L63,124 L60,128 L57,124 Z" fill="#26324a" />
            <rect x="14" y="97" width="22" height="6" rx="2" fill="#2b3550" transform="rotate(-18 25 100)" />
            <rect x="84" y="97" width="22" height="6" rx="2" fill="#2b3550" transform="rotate(18 95 100)" />
            <path d="M18,100 L33,96 M18,102 L33,98" stroke="#e8c64e" strokeWidth="1" transform="rotate(-3 25 100)" />
            <Buttons ys={[134, 144]} x={50} />
            <Buttons ys={[134, 144]} x={70} />
            <rect x="80" y="122" width="14" height="10" rx="1.5" fill="#fff" opacity="0.9" />
            <path d="M83,126 L91,126" stroke="#26324a" strokeWidth="1.2" />
          </g>
        ),
      };
    }
    case "work_jacket":
      return {
        body: (
          <g>
            <path d={TORSO} fill={c} />
            <Shade />
            <path d="M12,128 L108,128 M10,136 L110,136" stroke="#e9eef2" strokeWidth="4" opacity="0.9" />
            <path d="M12,128 L108,128 M10,136 L110,136" stroke="#9aa6b0" strokeWidth="0.8" opacity="0.7" />
          </g>
        ),
        top: (
          <g>
            <path d="M44,86 L44,98 C50,103 54,103 60,104 C66,103 70,103 76,98 L76,86 L68,90 L52,90 Z" fill={cd} />
            <path d="M60,104 L60,150" stroke={darken(c, 0.4)} strokeWidth="1.6" />
            <rect x="57.6" y="104" width="4.8" height="4" rx="1" fill="#c8ced4" />
            <rect x="22" y="110" width="20" height="12" rx="2" fill={cd} stroke={darken(c, 0.4)} strokeWidth="0.8" />
            <path d="M24,114 L40,114" stroke="#e9eef2" strokeWidth="1" opacity="0.8" />
            <path d="M24,98 L40,106 M96,98 L80,106" stroke="#e9eef2" strokeWidth="3" opacity="0.9" />
          </g>
        ),
      };
    case "lab_coat":
      return {
        body: (
          <g>
            <path d={TORSO} fill="#f7f8fb" />
            <path d="M62,94 L78,94 C102,100 115,119 115,150 L66,150 Z" fill="#9fa8b8" opacity="0.18" />
          </g>
        ),
        top: (
          <g>
            <path d="M48,92 L60,128 L72,92 Z" fill={c} />
            <path d="M44,91 L57,130 L46,142 L28,112 Z" fill="#fff" stroke="#c4cad6" strokeWidth="1" />
            <path d="M76,91 L63,130 L74,142 L92,112 Z" fill="#fff" stroke="#c4cad6" strokeWidth="1" />
            <rect x="80" y="122" width="18" height="16" rx="2" fill="#f1f3f8" stroke="#c4cad6" strokeWidth="1" />
            <path d="M86,122 L86,115 M90,122 L90,116" stroke="#3b6fd0" strokeWidth="1.8" strokeLinecap="round" />
            <path d="M43,91 C38,112 50,134 60,134 C70,134 82,112 77,91" fill="none" stroke="#3a404a" strokeWidth="3" strokeLinecap="round" />
            <circle cx="66" cy="136" r="5.6" fill="#c9d0da" stroke="#5a6270" strokeWidth="1.6" />
            <circle cx="66" cy="136" r="2.2" fill="#8892a2" />
          </g>
        ),
      };
    case "scrubs":
      return {
        body: (
          <g>
            <path d={TORSO} fill={c} />
            <Shade />
          </g>
        ),
        top: (
          <g>
            <path d="M47,93 L60,116 L73,93 Z" fill={skin} />
            <path d="M46,93 L60,117 L74,93" fill="none" stroke={cd} strokeWidth="3" strokeLinejoin="round" />
            <path d="M46,93 L60,117 L74,93" fill="none" stroke={cl} strokeWidth="1" opacity="0.6" />
            <rect x="78" y="122" width="19" height="15" rx="2" fill={cd} opacity="0.75" />
            <rect x="26" y="124" width="12" height="9" rx="1.5" fill="#fff" />
            <circle cx="32" cy="128" r="2" fill="#6aa7e8" />
          </g>
        ),
      };
    case "apron":
      return {
        body: (
          <g>
            <path d={TORSO} fill="#f1e9da" />
            <Shade />
          </g>
        ),
        top: (
          <g>
            <path d="M47,92 L60,108 L73,92 L70,96 L60,106 L50,96 Z" fill="#fff" />
            <path d="M47,119 Q60,111 73,119 L80,150 L40,150 Z" fill={c} />
            <path d="M47,119 L50,94 M73,119 L70,94" stroke={c} strokeWidth="4.6" strokeLinecap="round" />
            <path d="M47,119 Q60,111 73,119" fill="none" stroke={darken(c, 0.2)} strokeWidth="1.2" />
            <rect x="51" y="133" width="18" height="13" rx="2" fill={darken(c, 0.12)} />
            <path d="M55,128 L65,128" stroke={lighten(c, 0.4)} strokeWidth="1.4" opacity="0.6" />
          </g>
        ),
      };
    case "farm":
      return {
        body: (
          <g>
            <path d={TORSO} fill={c} />
            <Shade />
            <path d="M14,106 L106,106 M10,118 L110,118 M8,130 L112,130 M8,142 L112,142 M28,100 L28,150 M44,96 L44,150 M60,96 L60,150 M76,96 L76,150 M92,100 L92,150" stroke={darken(c, 0.3)} strokeWidth="1.6" opacity="0.32" />
          </g>
        ),
        top: (
          <g>
            <path d="M42,91 Q60,104 78,91 L82,102 Q60,118 38,102 Z" fill="#f6f4ee" stroke="#c7c3b6" strokeWidth="0.8" />
            <path d="M40,98 Q60,111 80,98 M41,102 Q60,115 79,102" stroke="#3f6fb0" strokeWidth="1.2" fill="none" />
            <path d="M52,108 L50,134 L58,134 L60,112 Z" fill="#f6f4ee" stroke="#c7c3b6" strokeWidth="0.8" />
            <path d="M51,118 L58,118 M50.5,124 L58,124" stroke="#3f6fb0" strokeWidth="1.2" />
          </g>
        ),
      };
    case "hoodie":
      return {
        body: (
          <g>
            <path d="M36,92 C28,100 28,112 40,114 L80,114 C92,112 92,100 84,92 Z" fill={cd} />
            <path d={TORSO} fill={c} />
            <Shade />
            <path d="M32,150 L38,130 L82,130 L88,150 Z" fill={cd} opacity="0.55" />
          </g>
        ),
        top: (
          <g>
            <path d="M46,93 Q60,116 74,93 Z" fill={skin} />
            <path d="M42,92 Q60,121 78,92" fill="none" stroke={cd} strokeWidth="7" strokeLinecap="round" />
            <path d="M42,92 Q60,121 78,92" fill="none" stroke={lighten(c, 0.15)} strokeWidth="1.2" opacity="0.5" />
            <path d="M54,110 L53,128 M66,110 L67,126" stroke={lighten(c, 0.75)} strokeWidth="1.8" strokeLinecap="round" />
            <circle cx="53" cy="129" r="2" fill={lighten(c, 0.75)} />
            <circle cx="67" cy="127" r="2" fill={lighten(c, 0.75)} />
          </g>
        ),
      };
    case "cardigan":
      return {
        body: (
          <g>
            <path d={TORSO} fill={c} />
            <Shade />
          </g>
        ),
        top: (
          <g>
            <path d="M47,93 L60,118 L73,93 L69,150 L51,150 Z" fill="#fbf7ee" />
            <path d="M47,93 L60,108 L54,98 Z" fill="#fff" />
            <path d="M73,93 L60,108 L66,98 Z" fill="#fff" />
            <path d="M47,93 L51,150 M73,93 L69,150" stroke={darken(c, 0.25)} strokeWidth="2" />
            <Buttons ys={[120, 132, 144]} x={55} fill={lighten(c, 0.55)} />
          </g>
        ),
      };
    case "uniform_police":
    default:
      return {
        body: (
          <g>
            <path d={TORSO} fill={c} />
            <Shade />
          </g>
        ),
        top: (
          <g>
            <path d="M47,92 L60,118 L73,92 Z" fill="#cfd9e6" />
            <path d="M43,92 L57,124 L45,138 L28,110 Z" fill={darken(c, 0.2)} />
            <path d="M77,92 L63,124 L75,138 L92,110 Z" fill={darken(c, 0.2)} />
            <path d="M58,96 L62,96 L61,100 L59,100 Z" fill="#181c24" />
            <path d="M59,100 L61,100 L63,124 L60,128 L57,124 Z" fill="#181c24" />
            <rect x="16" y="98" width="20" height="7" rx="2" fill="#1d2432" transform="rotate(-18 26 101)" />
            <rect x="84" y="98" width="20" height="7" rx="2" fill="#1d2432" transform="rotate(18 94 101)" />
            <path d="M22,98 L22,104 M27,97 L27,103" stroke="#e8c64e" strokeWidth="1.6" />
            <path d="M82,112 L92,112 L92,124 L87,130 L82,124 Z" fill="#e5bd45" stroke="#9a7420" strokeWidth="0.8" />
            <circle cx="87" cy="119" r="2.6" fill="#b8323f" />
            <rect x="28" y="116" width="14" height="6" rx="1" fill="#c9d0da" />
          </g>
        ),
      };
  }
}

// ---------------------------------------------------------------- headwear & accessories

function Headwear({ kind, c }: { kind: "cap" | "police" | "helmet" | "headset"; c: string }) {
  const cd = darken(c, 0.25);
  switch (kind) {
    case "cap":
      return (
        <g>
          <path d="M32,36 C30,8 90,8 88,36 Z" fill={c} />
          <path d="M60,10 L60,36" stroke={cd} strokeWidth="1" opacity="0.5" />
          <path d="M31,31 L89,31 L89,37 L31,37 Z" fill={cd} />
          <path d="M28,37 C38,52 82,52 92,37 C82,42 38,42 28,37 Z" fill={cd} />
          <circle cx="60" cy="23" r="4.4" fill="#e5bd45" stroke="#9a7420" strokeWidth="0.8" />
          <circle cx="60" cy="23" r="1.8" fill="#9a7420" />
        </g>
      );
    case "police":
      return (
        <g>
          <path d="M31,36 L35,12 C46,6 74,6 85,12 L89,36 Z" fill={c} />
          <path d="M31,30 L89,30 L89,37 L31,37 Z" fill="#14181f" />
          <path d="M28,37 C38,48 82,48 92,37 C82,41 38,41 28,37 Z" fill="#14181f" />
          <path d="M60,13 L67,17 L66,26 L60,30 L54,26 L53,17 Z" fill="#e5bd45" stroke="#9a7420" strokeWidth="0.8" />
          <circle cx="60" cy="21" r="2.6" fill="#b8323f" />
          <path d="M33,36 L87,36" stroke="#e8c64e" strokeWidth="1" opacity="0.8" />
        </g>
      );
    case "helmet":
      return (
        <g>
          <path d="M29,38 C26,4 94,4 91,38 Z" fill={c} />
          <path d="M55,7 L65,7 L67,36 L53,36 Z" fill={darken(c, 0.12)} />
          <path d="M40,14 Q60,5 80,14" fill="none" stroke="#fff" strokeWidth="2" opacity="0.5" strokeLinecap="round" />
          <path d="M24,38 C40,34 80,34 96,38 L94,44 C80,40 40,40 26,44 Z" fill={darken(c, 0.18)} />
        </g>
      );
    default:
      return (
        <g>
          <path d="M33,46 C31,6 89,6 87,46" fill="none" stroke="#2c3036" strokeWidth="4" strokeLinecap="round" />
          <ellipse cx="33" cy="54" rx="6" ry="8.5" fill="#2c3036" />
          <ellipse cx="87" cy="54" rx="6" ry="8.5" fill="#2c3036" />
          <ellipse cx="33" cy="54" rx="3" ry="5" fill="#586070" />
          <path d="M33,62 Q36,78 53,72" fill="none" stroke="#2c3036" strokeWidth="2.2" strokeLinecap="round" />
          <circle cx="54" cy="72" r="3.2" fill="#2c3036" />
        </g>
      );
  }
}

// ---------------------------------------------------------------- face

function Brows({ expression, color }: { expression: Expression; color: string }) {
  const p = { fill: "none", stroke: color, strokeWidth: 2.6, strokeLinecap: "round" as const };
  switch (expression) {
    case "smile":
      return (
        <g>
          <path d="M39,43.5 Q47,38.5 55,43" {...p} />
          <path d="M65,43 Q73,38.5 81,43.5" {...p} />
        </g>
      );
    case "concern":
      return (
        <g>
          <path d="M39,46 L55,40.5" {...p} />
          <path d="M65,40.5 L81,46" {...p} />
        </g>
      );
    case "frown":
      return (
        <g>
          <path d="M39,40 L55,46.5" {...p} />
          <path d="M65,46.5 L81,40" {...p} />
        </g>
      );
    case "thinking":
      return (
        <g>
          <path d="M39,44 L55,43" {...p} />
          <path d="M65,38.5 Q73,34.5 81,40" {...p} />
        </g>
      );
    case "surprised":
      return (
        <g>
          <path d="M39,40 Q47,33.5 55,39.5" {...p} />
          <path d="M65,39.5 Q73,33.5 81,40" {...p} />
        </g>
      );
    default:
      return (
        <g>
          <path d="M39,43 L55,42.5" {...p} />
          <path d="M65,42.5 L81,43" {...p} />
        </g>
      );
  }
}

function Eyes({ expression, female, delay }: { expression: Expression; female: boolean; delay: number }) {
  const surprised = expression === "surprised";
  const look = expression === "thinking" ? { dx: 1.6, dy: -1.8 } : { dx: 0, dy: 0 };
  const ry = surprised ? 5.6 : 4.5;
  const rx = surprised ? 3.9 : 3.5;
  const eye = (cx: number) => (
    <g key={cx}>
      {surprised && <ellipse cx={cx} cy="53" rx="5.4" ry="6.6" fill="#fff" stroke="#d9c9bb" strokeWidth="0.8" />}
      <ellipse cx={cx + look.dx} cy={53 + look.dy} rx={rx} ry={ry} fill={INK} />
      <circle cx={cx + look.dx - 1.1} cy={53 + look.dy - 1.6} r="1.3" fill="#fff" />
      <circle cx={cx + look.dx + 1.1} cy={53 + look.dy + 1.5} r="0.6" fill="#fff" opacity="0.7" />
      {female && (
        <path
          d={`M${cx - 4.6},50.6 Q${cx},${47.2 - (surprised ? 1.5 : 0)} ${cx + 4.6},50.6`}
          fill="none"
          stroke={INK}
          strokeWidth="1.6"
          strokeLinecap="round"
        />
      )}
    </g>
  );
  return (
    <g className={styles.blink} style={{ animationDelay: `${-delay}s` }}>
      {eye(47.5)}
      {eye(72.5)}
    </g>
  );
}

function Mouth({ expression, speaking, female }: { expression: Expression; speaking: boolean; female: boolean }) {
  const col = female ? "#c4565c" : "#8f4a44";
  const stroke = { fill: "none", stroke: col, strokeWidth: 2.2, strokeLinecap: "round" as const };
  if (speaking) {
    const wide = expression === "smile";
    return (
      <g className={styles.talk}>
        <ellipse cx="60" cy="68" rx={wide ? 6.2 : 4.8} ry={wide ? 5 : 4.6} fill="#5b1d25" />
        <ellipse cx="60" cy="70.6" rx={wide ? 3.6 : 3} ry="1.8" fill="#e0707a" />
        {wide && <path d="M54,65 Q60,67.5 66,65 L66,64 L54,64 Z" fill="#fff" />}
      </g>
    );
  }
  switch (expression) {
    case "smile":
      return (
        <g>
          <path d="M51,64.5 Q60,75 69,64.5 Z" fill="#7a2a31" stroke={col} strokeWidth="1.6" strokeLinejoin="round" />
          <path d="M53,65.4 L67,65.4 L65,68 L55,68 Z" fill="#fff" />
        </g>
      );
    case "concern":
      return <path d="M53,69.5 Q60,64.5 67,69.5" {...stroke} />;
    case "frown":
      return <path d="M52,70.5 Q60,62.5 68,70.5" {...stroke} />;
    case "thinking":
      return <path d="M54,68 Q59,66 64,67.4 Q67,68 68,66.5" {...stroke} />;
    case "surprised":
      return <ellipse cx="60" cy="68" rx="4" ry="5.2" fill="#5b1d25" stroke={col} strokeWidth="1.2" />;
    default:
      return <path d="M54,67 Q60,69.5 66,67" {...stroke} />;
  }
}

// ---------------------------------------------------------------- main

function AvatarBody({
  participant,
  expression = "neutral",
  speaking = false,
}: Pick<AvatarProps, "participant" | "expression" | "speaking">) {
  const spec = participant.avatar;
  const skin = SKINS[((spec.skinTone % 6) + 6) % 6];
  const shadow = darken(skin, 0.14);
  const female = spec.gender === "female";
  const hairColor = hairColorFor(spec);
  const browColor = darken(hairColor, spec.age >= 60 ? 0.25 : 0.1);
  const hairStyle = ((spec.hairStyle % 8) + 8) % 8;
  const delay = (hash(participant.id) % 4600) / 1000;

  const c = spec.outfitColor || "#3a4a6b";
  const ctx: OutfitCtx = { c, cd: darken(c, 0.22), cl: lighten(c, 0.25), skin, gender: spec.gender, accessory: spec.accessory };
  const { body, top } = outfitParts(spec.outfit, ctx);

  // Headwear rules: outfit decides for uniforms, otherwise accessory.
  let headwear: "cap" | "police" | "helmet" | "headset" | null = null;
  let headColor = c;
  if (spec.outfit === "uniform_driver") {
    headwear = "cap";
    headColor = darken(c, 0.1);
  } else if (spec.outfit === "uniform_police") {
    headwear = "police";
    headColor = c;
  } else if (spec.outfit === "work_jacket" || spec.accessory === "helmet") {
    headwear = "helmet";
    headColor = spec.outfit === "work_jacket" && luminance(c) > 0.62 ? "#f4f4f4" : "#f2c230";
  } else if (spec.outfit === "farm" || spec.accessory === "cap") {
    headwear = "cap";
    headColor = spec.outfit === "farm" ? mix(c, "#e9dfb8", 0.55) : darken(c, 0.15);
  } else if (spec.accessory === "headset") {
    headwear = "headset";
  }

  const hasGlasses = spec.glasses || spec.accessory === "glasses";
  const stethoscope = spec.accessory === "stethoscope" && spec.outfit !== "lab_coat";
  const lanyard = spec.accessory === "name_lanyard" || spec.outfit === "cardigan";

  return (
    <g>
      <Hair style={hairStyle} color={hairColor} part="back" />
      {body}
      {/* neck */}
      <path d="M51,72 L51,92 C51,98 69,98 69,92 L69,72 Z" fill={skin} />
      <path d="M51,80 Q60,92 69,80 L69,72 L51,72 Z" fill={shadow} opacity="0.55" />
      {top}
      {/* accessories on torso */}
      {stethoscope && (
        <g>
          <path d="M43,91 C38,112 50,134 60,134 C70,134 82,112 77,91" fill="none" stroke="#3a404a" strokeWidth="3" strokeLinecap="round" />
          <circle cx="66" cy="136" r="5.6" fill="#c9d0da" stroke="#5a6270" strokeWidth="1.6" />
        </g>
      )}
      {lanyard && (
        <g>
          <path d="M46,92 L57,129 M74,92 L63,129" stroke="#d6404f" strokeWidth="3" fill="none" />
          <rect x="51" y="128" width="18" height="20" rx="2.5" fill="#fff" stroke="#9aa3b2" strokeWidth="1" />
          <circle cx="60" cy="135" r="3.6" fill={skin} />
          <path d="M54,142 L66,142 M55,145 L65,145" stroke="#9aa3b2" strokeWidth="1.2" />
        </g>
      )}
      {spec.accessory === "badge" && spec.outfit !== "suit_formal" && (
        <g>
          <circle cx="82" cy="115" r="5" fill="#e5bd45" stroke="#9a7420" strokeWidth="0.8" />
          <circle cx="82" cy="115" r="2.2" fill="#b8323f" />
        </g>
      )}
      {spec.accessory === "sash" && (
        <g>
          <path d="M26,98 L42,93 L114,146 L100,150 L90,150 Z" fill="#b4202f" />
          <path d="M26,98 L42,93 M90,150 L100,150" stroke="#e5bd45" strokeWidth="2" />
          <path d="M31,99 L89,148" stroke="#e5bd45" strokeWidth="1.2" opacity="0.7" />
          <circle cx="34" cy="99" r="5" fill="#e5bd45" stroke="#9a7420" strokeWidth="0.8" />
        </g>
      )}

      {/* head */}
      <ellipse cx="33.8" cy="54" rx="4.4" ry="6.2" fill={skin} />
      <ellipse cx="86.2" cy="54" rx="4.4" ry="6.2" fill={skin} />
      <ellipse cx="33.8" cy="54.5" rx="2" ry="3.4" fill={shadow} opacity="0.5" />
      <ellipse cx="86.2" cy="54.5" rx="2" ry="3.4" fill={shadow} opacity="0.5" />
      <ellipse cx="60" cy="50" rx={female ? 25.5 : 26.5} ry="28.5" fill={skin} />
      <path d="M36,62 C40,80 50,80 60,80 C70,80 80,80 84,62 C80,74 70,78 60,78 C50,78 40,74 36,62 Z" fill={shadow} opacity="0.35" />

      {hairStyle === 7 && <ellipse cx="54" cy="26" rx="9" ry="4" fill="#fff" opacity="0.28" />}

      {/* face details */}
      {(expression === "smile" || expression === "surprised") && (
        <g fill="#f08a8a" opacity={expression === "smile" ? 0.42 : 0.28}>
          <ellipse cx="40" cy="63" rx="5.4" ry="3.2" />
          <ellipse cx="80" cy="63" rx="5.4" ry="3.2" />
        </g>
      )}
      <path d="M58.4,60 Q60,63 61.8,60.6" fill="none" stroke={shadow} strokeWidth="1.5" strokeLinecap="round" />
      {spec.age >= 40 && (
        <g fill="none" stroke={darken(skin, 0.35)} strokeWidth="1.2" strokeLinecap="round" opacity="0.4">
          <path d="M47,62 Q44,68 47.5,75" />
          <path d="M73,62 Q76,68 72.5,75" />
        </g>
      )}
      {spec.age >= 60 && (
        <g fill="none" stroke={darken(skin, 0.35)} strokeWidth="1" strokeLinecap="round" opacity="0.38">
          <path d="M45,37 Q60,33.5 75,37" />
          <path d="M47,41 Q60,38 73,41" />
          <path d="M40,52 L35,50.5 M40,54.5 L35,55.5" />
          <path d="M80,52 L85,50.5 M80,54.5 L85,55.5" />
          <path d="M42,59 Q47.5,62 53,59 M67,59 Q72.5,62 78,59" />
        </g>
      )}
      <Brows expression={expression} color={browColor} />
      <Eyes expression={expression} female={female} delay={delay} />
      {hasGlasses && (
        <g fill="none" stroke="#2d2d36" strokeWidth="1.9">
          <rect x="36" y="44" width="21" height="16" rx="6" fill="#bcd8f0" fillOpacity="0.2" />
          <rect x="63" y="44" width="21" height="16" rx="6" fill="#bcd8f0" fillOpacity="0.2" />
          <path d="M57,50 Q60,48 63,50" />
          <path d="M36,49 L32.5,48.5 M84,49 L87.5,48.5" />
          <path d="M39,47 L43,47" stroke="#fff" strokeWidth="1.2" opacity="0.7" />
        </g>
      )}
      <Mouth expression={expression} speaking={speaking} female={female} />

      <Hair style={hairStyle} color={hairColor} part="front" />
      {headwear && <Headwear kind={headwear} c={headColor} />}

      {/* foreground held items */}
      {spec.accessory === "laptop" && (
        <g>
          <path d="M22,150 L26,118 C26,115 28,114 30,114 L90,114 C92,114 94,115 94,118 L98,150 Z" fill="#b8bec8" stroke="#8a929e" strokeWidth="1.2" />
          <path d="M24,150 L28,120 L92,120 L96,150 Z" fill="#c9ced6" opacity="0.5" />
          <circle cx="60" cy="132" r="5" fill="#eef0f4" opacity="0.9" />
          <path d="M60,127 q2,-3 4,-3 q-1,3 -4,3 Z" fill="#eef0f4" />
        </g>
      )}
      {spec.accessory === "clipboard" && (
        <g transform="rotate(-8 90 134)">
          <rect x="74" y="112" width="30" height="38" rx="3" fill="#a9733f" stroke="#7a4f27" strokeWidth="1" />
          <rect x="78" y="118" width="22" height="30" rx="1.5" fill="#fff" />
          <rect x="84" y="109" width="10" height="7" rx="2" fill="#c9ced6" stroke="#7a828e" strokeWidth="0.8" />
          <path d="M81,124 L97,124 M81,129 L97,129 M81,134 L93,134 M81,139 L97,139" stroke="#9aa3b2" strokeWidth="1.2" />
        </g>
      )}
    </g>
  );
}

export default function Avatar({ participant, expression = "neutral", speaking = false, scale = 1, standalone = true, highlight, className }: AvatarProps & { highlight?: boolean; className?: string }) {
  const body = <AvatarBody participant={participant} expression={expression} speaking={speaking} />;
  if (!standalone) return <g className={className}>{body}</g>;
  return (
    <svg
      viewBox={`0 0 ${AVATAR_W} ${AVATAR_H}`}
      width={AVATAR_W * scale}
      height={AVATAR_H * scale}
      className={className}
      role="img"
      aria-label={participant.name}
      style={{ display: "block", overflow: "visible" }}
    >
      {highlight && <ellipse cx="60" cy="90" rx="62" ry="70" fill="#ffe28a" opacity="0.35" />}
      {body}
    </svg>
  );
}

export type { Participant };
