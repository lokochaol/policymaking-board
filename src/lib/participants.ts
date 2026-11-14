import type { AvatarSpec, Outfit, Participant, RoleTemplate } from "@/lib/types";
import { getCountry } from "@/data/countries";
import { roleById } from "@/lib/engine/util";

// ---------- deterministic PRNG ----------
function xfnv1a(str: string): number {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}
function mulberry32(a: number) {
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
type Rng = () => number;
const pickOf = <T,>(r: Rng, xs: T[]): T => xs[Math.floor(r() * xs.length)];
const int = (r: Rng, lo: number, hi: number) => lo + Math.floor(r() * (hi - lo + 1));

export const PERSONALITIES = [
  "慎重で数字に強い", "情に厚く、困っている人を放っておけない", "せっかちで結論を急ぐ", "穏やかで聞き上手",
  "頑固だが筋は通す", "好奇心が強く新しいもの好き", "皮肉屋だが根は優しい", "負けず嫌いで議論好き",
  "控えめで自分から発言しない", "明るくムードメーカー", "現実主義で理想論が嫌い", "理想を語るのが好き",
  "義理堅く、約束を重んじる", "計算高く、損得に敏感", "心配性で最悪の場合を考える", "楽観的でなんとかなると思う",
  "几帳面で細部にこだわる", "大らかで細かいことは気にしない", "正義感が強く不公平が許せない", "調整役を買って出がち",
  "言葉を選びすぎて回りくどい", "率直すぎて誤解されやすい", "伝統を大切にする", "改革志向で現状に不満",
  "人の話を最後まで聞いてから話す", "思いつきで話し始めて脱線する", "冷静で感情を表に出さない", "感激屋で涙もろい",
  "地元への愛着が強い", "データと根拠を重視する",
];

const DARK_HAIR = ["#1b1b1b", "#2a211d", "#3b2a20", "#14100e"];
const BROWN_HAIR = ["#4a3224", "#5c3d2a", "#6e4a30", "#2f2018"];
const LIGHT_HAIR = ["#b88a4a", "#d2a85f", "#8a5a30", "#c7b07a"];
const RED_HAIR = ["#9a4a25"];
const GRAY_HAIR = ["#c8c8c8", "#e3e3e3", "#9a9a9a", "#b0b0b0"];
const BLONDE_COUNTRIES = new Set(["SE", "NO", "FI", "DK", "DE", "NL", "GB", "IE", "US", "CA", "AU", "NZ", "FR", "PL", "RU", "CH", "AT"]);
const MIXED_COUNTRIES = new Set(["IT", "ES", "PT", "GR", "TR", "BR", "MX", "AR", "CL", "IL", "IR", "EG"]);

function hairPalette(code: string): string[] {
  if (BLONDE_COUNTRIES.has(code)) return [...LIGHT_HAIR, ...BROWN_HAIR, ...RED_HAIR, ...DARK_HAIR.slice(0, 1)];
  if (MIXED_COUNTRIES.has(code)) return [...BROWN_HAIR, ...DARK_HAIR, ...LIGHT_HAIR.slice(0, 1)];
  return DARK_HAIR;
}

const OUTFIT_COLORS: Record<Outfit, string[]> = {
  school_uniform_jhs: ["#1f2a44", "#26334f"],
  school_uniform_hs: ["#2b3a67", "#3a4a6b", "#4a2f3a"],
  casual: ["#5b8def", "#e0795a", "#6bb38a", "#d9b44a", "#8e7cc3"],
  suit: ["#2c3340", "#1f2430", "#3a3f4b", "#454c59"],
  suit_formal: ["#141a2e", "#18203a"],
  office_casual: ["#6a7fa6", "#8a9ab5", "#a6b3a0", "#c9bfae"],
  uniform_driver: ["#1e3a6e", "#223f73", "#1b2f5a"],
  work_jacket: ["#3d6a8a", "#c58a2b", "#4a7a5a"],
  lab_coat: ["#f1f3f5", "#e8ecef"],
  scrubs: ["#3f9aa6", "#4a8f7a", "#5a7fb8"],
  apron: ["#e0a24a", "#c9d6d0", "#a8c8a0"],
  farm: ["#7a8a4a", "#5f7a3a", "#8a7a4a"],
  hoodie: ["#e85a8a", "#f2a23a", "#4ab0e0", "#8a5ae0", "#5ac27a"],
  cardigan: ["#a8806a", "#7a8aa8", "#9a7a9a", "#6a9a8a"],
  uniform_police: ["#1c2b4a", "#22335a"],
};

const CJK = /[぀-ヿ㐀-鿿가-힯]/;

function generate(role: RoleTemplate, countryCode: string, seed: string, seatIndex: number, id?: string): Participant {
  const country = getCountry(countryCode);
  if (!country) throw new Error(`unknown country: ${countryCode}`);
  const r = mulberry32(xfnv1a(`${seed}|${role.id}|${countryCode}`));
  const gender: "male" | "female" = r() < 0.5 ? "male" : "female";
  const [lo, hi] = role.ageRange;
  const age = int(r, lo, hi);
  const given = pickOf(r, gender === "male" ? country.givenNames.male : country.givenNames.female);
  const family = pickOf(r, country.familyNames);
  const name = CJK.test(family) ? `${family} ${given}` : `${given} ${family}`;
  const skinTone = pickOf(r, country.skinTones.length ? country.skinTones : [2]);

  let hairStyle: number;
  if (gender === "male") {
    hairStyle = pickOf(r, [0, 0, 1, 1, 2, 0, 1]);
    if (age >= 50 && r() < 0.3) hairStyle = 7;
    if (age >= 60 && r() < 0.3) hairStyle = 7;
  } else {
    hairStyle = pickOf(r, [3, 4, 5, 6, 4, 3, 5]);
  }
  const grayChance = age < 35 ? 0 : Math.min(0.95, (age - 35) / 35);
  const hairColor = r() < grayChance * (age >= 62 ? 1 : 0.8) ? pickOf(r, GRAY_HAIR) : pickOf(r, hairPalette(countryCode));
  const outfitColor = pickOf(r, OUTFIT_COLORS[role.outfit] ?? ["#444444"]);
  const glasses = role.accessory === "glasses" || r() < 0.1 + (age > 45 ? 0.15 : 0);
  const avatar: AvatarSpec = {
    skinTone,
    hairStyle,
    hairColor,
    gender,
    age,
    outfit: role.outfit,
    outfitColor,
    accessory: role.accessory,
    glasses,
  };
  const pid =
    id ??
    `p_${xfnv1a(seed + "a").toString(16).padStart(8, "0")}${xfnv1a(seed + "b" + role.id).toString(16).padStart(8, "0")}`;
  return { id: pid, roleId: role.id, countryCode, name, age, personality: pickOf(r, PERSONALITIES), avatar, seatIndex, isFacilitator: false };
}

/** Deterministic: the same (roleId, countryCode, seed) always yields the same person. */
export function createParticipant(
  roleId: string,
  countryCode: string,
  seed: string,
  seatIndex: number,
  /** Pass for custom roles that are not in the static catalog. */
  role?: RoleTemplate,
): Participant {
  const t = role ?? roleById(roleId);
  if (!t) throw new Error(`unknown role: ${roleId}`);
  return generate(t, countryCode, seed, seatIndex);
}

/** New name/appearance/personality for the same seat, role and country (id is kept). */
export function rerollParticipant(p: Participant, newSeed: string, role?: RoleTemplate): Participant {
  const t = role ?? roleById(p.roleId);
  if (!t) throw new Error(`unknown role: ${p.roleId}`);
  return { ...generate(t, p.countryCode, newSeed, p.seatIndex, p.id), isFacilitator: p.isFacilitator };
}
