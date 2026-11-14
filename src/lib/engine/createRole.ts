import { z } from "zod";
import type { Accessory, ModelTier, Outfit, RoleCategory, RoleTemplate, UsageTotals } from "@/lib/types";
import { CATEGORY_LABELS } from "@/data/roles";
import { getCountry } from "@/data/countries";
import { isMockMode } from "./client";
import { parseStructured, webResearch } from "./webSearch";
import { emptyUsage, hashString, staticRole } from "./util";

const S = "claude-sonnet-5-5";
const O = "claude-opus-5-5";

export const OUTFITS = [
  "school_uniform_jhs", "school_uniform_hs", "casual", "suit", "suit_formal", "office_casual", "uniform_driver",
  "work_jacket", "lab_coat", "scrubs", "apron", "farm", "hoodie", "cardigan", "uniform_police",
] as const satisfies readonly Outfit[];
export const ACCESSORIES = [
  "none", "glasses", "badge", "sash", "cap", "helmet", "headset", "stethoscope", "laptop", "clipboard", "name_lanyard",
] as const satisfies readonly Accessory[];

const roleSchema = z.object({
  title: z.string(),
  shortTitle: z.string(),
  ageMin: z.number().int(),
  ageMax: z.number().int(),
  outfit: z.enum(OUTFITS),
  accessory: z.enum(ACCESSORIES),
  description: z.string(),
  interests: z.array(z.string()),
  concerns: z.array(z.string()),
  privateConcerns: z.array(z.string()),
  constraints: z.array(z.string()),
  speechStyle: z.string(),
  influence: z.number().int(),
  expertise: z.number().int(),
});

export interface CreateRoleInput {
  title: string;
  category: RoleCategory;
  sketch: string;
  topic: string;
  countryCode?: string;
  modelTier: ModelTier;
}
export interface CreateRoleResult {
  role: RoleTemplate;
  usage: UsageTotals;
}

const RESEARCH_SYSTEM = `あなたは社会調査のリサーチャーです。指定された「立場の人」の実際の状況を、ウェブ検索で調べます。
調べること：仕事・暮らしの実態（1日の流れ、収入、働き方、人員や予算の事情）、本音の利害（何を得たく、何を失いたくないか）、よく聞かれる主張と典型的な論拠、業界・地域の事情、受けている圧力、誰に説明責任を負っているか、公の場では言いにくいこと。
議題との接点も押さえてください。事実と推測を区別し、日本語の箇条書きメモで出力します。特定の実在の個人や団体を中傷しないこと。`;

const STRUCT_SYSTEM = `あなたは、政策会議のシミュレーション用に「ある立場の人物像テンプレート」を作る編集者です。調査メモを踏まえ、次の方針で RoleTemplate を作ります。
- すべて日本語。既存カタログ（例：「県立高校の普通科2年生」「路線バスの運転手」）と同じ具体性と厚みにする。description は日々の暮らし・責任・誰に説明責任を負うかを3〜4文。
- interests（立場ではなく利益）3〜5個、concerns（恐れ・受けている圧力）3〜5個、privateConcerns（オフレコでしか言わない本音）2〜3個、constraints（説明責任・公の場で約束できないこと）2〜3個。短い名詞句〜1文。
- speechStyle：語彙・口調・文の長さ・口癖を具体的に（1〜2文）。
- shortTitle は8文字程度。ageMin/ageMax はこの立場の典型的な年齢幅（幅は5〜15歳）。
- influence は政策過程での形式的な影響力 0〜100、expertise は政策・技術議論への習熟度 0〜100（議論の語彙に影響）。
- outfit と accessory は、指定の選択肢から最も合うものを選ぶ。
- 調査で分かった現実を反映し、ステレオタイプや戯画にしない。`;

function slugify(title: string): string {
  const ascii = title.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "").slice(0, 16);
  return ascii || "role";
}

export function newRoleId(title: string): string {
  const suffix = crypto.randomUUID().replace(/-/g, "").slice(0, 6);
  return `custom_${slugify(title)}_${suffix}`;
}

const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, Math.round(n)));

export async function runCreateRole(input: CreateRoleInput): Promise<CreateRoleResult> {
  const meter = emptyUsage();
  const id = newRoleId(input.title);
  if (isMockMode()) return { role: mockRole(id, input), usage: meter };

  const model = input.modelTier === "premium" ? O : S;
  const country = getCountry(input.countryCode ?? "JP")?.name ?? "日本";
  const target = `## 立場\n${input.title}（カテゴリ：${CATEGORY_LABELS[input.category]}）\n${input.sketch}\n\n## 議題\n${input.topic}\n\n## 国\n${country}`;
  const notes = await webResearch({ model, system: RESEARCH_SYSTEM, user: target, maxUses: 4, effort: "medium", meter, maxTokens: 6000 });
  const parsed = await parseStructured({
    model,
    system: STRUCT_SYSTEM,
    user: `${target}\n\n## 調査メモ\n${notes.memo || "（調査メモなし。一般知識から作ってください）"}\n\n## outfit の選択肢\n${OUTFITS.join(", ")}\n\n## accessory の選択肢\n${ACCESSORIES.join(", ")}`,
    schema: roleSchema,
    effort: "low",
    meter,
    maxTokens: 5000,
  });
  if (!parsed) throw new Error("立場の作成に失敗しました。もう一度お試しください。");
  const lo = clamp(parsed.ageMin, 13, 90);
  const hi = clamp(Math.max(parsed.ageMax, lo), lo, 95);
  const role: RoleTemplate = {
    id,
    category: input.category,
    title: parsed.title || input.title,
    shortTitle: parsed.shortTitle || input.title.slice(0, 8),
    ageRange: [lo, hi],
    outfit: parsed.outfit,
    accessory: parsed.accessory,
    description: parsed.description,
    interests: parsed.interests,
    concerns: parsed.concerns,
    privateConcerns: parsed.privateConcerns,
    constraints: parsed.constraints,
    speechStyle: parsed.speechStyle,
    influence: clamp(parsed.influence, 0, 100),
    expertise: clamp(parsed.expertise, 0, 100),
  };
  return { role, usage: meter };
}

function mockRole(id: string, input: CreateRoleInput): RoleTemplate {
  const h = hashString(input.title);
  const base = staticRole("town_office_staff");
  return {
    id,
    category: input.category,
    title: input.title,
    shortTitle: input.title.slice(0, 8),
    ageRange: [30 + (h % 10), 45 + (h % 10)],
    outfit: "office_casual",
    accessory: "name_lanyard",
    description: `${input.title}。${input.sketch} 日々の業務に追われながら、現場の実感をもとに議題「${input.topic.slice(0, 30)}」を見ている。`,
    interests: ["現場の負担が増えないこと", "働きがいと待遇の改善", "利用者に実際に役立つ仕組み"],
    concerns: ["人手不足", "予算の削減", "制度が現場の実態と合わないこと"],
    privateConcerns: ["上司や組織に遠慮して現場の本音が言えない", "自分の雇用が不安定"],
    constraints: ["所属組織の公式見解に沿う必要がある", "予算について約束はできない"],
    speechStyle: base?.speechStyle ?? "丁寧だが率直。具体的な現場の例を挙げて話す。",
    influence: 25 + (h % 20),
    expertise: 40 + (h % 20),
  };
}
