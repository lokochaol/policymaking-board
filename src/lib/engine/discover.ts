import { z } from "zod";
import type { ModelTier, RoleCategory, RoleTemplate, StakeholderGroup, StakeholderSuggestion, UsageTotals } from "@/lib/types";
import { CATEGORY_LABELS, ROLES } from "@/data/roles";
import { getCountry } from "@/data/countries";
import { isMockMode } from "./client";
import { parseStructured, webResearch } from "./webSearch";
import { emptyUsage, makeRoleResolver, type RoleResolver } from "./util";

const O = "claude-opus-5-5";
const S = "claude-sonnet-5-5";
const H = "claude-haiku-5-5";

export const GROUPS: StakeholderGroup[] = ["direct", "affected", "decision_maker", "implementer", "funder", "expert", "overlooked"];
export const GROUP_LABELS: Record<StakeholderGroup, string> = {
  direct: "直接の当事者",
  affected: "影響を受ける人",
  decision_maker: "決定権を持つ人",
  implementer: "実施・運用を担う人",
  funder: "費用を負担する人",
  expert: "専門家",
  overlooked: "見落とされがちな声",
};

const CATEGORIES = Object.keys(CATEGORY_LABELS) as [RoleCategory, ...RoleCategory[]];

export interface DiscoverInput {
  topic: string;
  background?: string;
  countryCodes: string[];
  selectedRoleIds: string[];
  customRoles: RoleTemplate[];
  modelTier: ModelTier;
}
export interface DiscoverResult {
  suggestions: StakeholderSuggestion[];
  usage: UsageTotals;
}

const suggestionSchema = z.object({
  suggestions: z.array(
    z.object({
      group: z.enum(["direct", "affected", "decision_maker", "implementer", "funder", "expert", "overlooked"]),
      roleId: z.string().nullable(),
      newRole: z.object({ title: z.string(), category: z.enum(CATEGORIES), sketch: z.string() }).nullable(),
      countryCode: z.string().nullable(),
      reason: z.string(),
      stakes: z.string(),
      importance: z.enum(["high", "medium", "low"]),
    }),
  ),
});

/** Static catalog + this request's custom roles only (no global registry). */
function catalog(customRoles: RoleTemplate[]): { id: string; title: string; category: RoleCategory }[] {
  return [...ROLES, ...customRoles].map((r) => ({ id: r.id, title: r.title, category: r.category }));
}

const RESEARCH_SYSTEM = `あなたは政策・社会課題の「ステークホルダー分析」の専門家です。与えられた議題について、ウェブ検索で実態を調べながら、関係する立場を漏れなく洗い出します。
次の観点すべてで考えてください。
- 直接の当事者：その問題・制度・事業を直接に経験する、または利用する人
- 影響を受ける人：間接的・二次的に影響を受ける人（家族、取引先、地域、競合、将来世代を含む）
- 決定権を持つ人：法律・予算・許認可・方針を決める人と機関
- 実施・運用を担う人：現場で実行し、運用し、責任を負う人
- 費用を負担する人：納税者、保険料の負担者、事業者、寄付者、投資家など
- 専門家：研究者、技術者、法律家、医療者、現場の経験を持つ人
- 見落とされがちな声：子ども、少数者、将来世代、地方・農村の住民、外国人労働者、障害のある人、高齢者、非正規で働く人、声を上げにくい人など（議題に応じて）
議題に実際に関わる具体的な立場（肩書き・職種）の候補を、理由と利害（得るもの・失うもの）つきでメモにまとめてください。日本語で、箇条書きで構いません。20〜35個の候補を目安に。`;

const STRUCT_SYSTEM = `あなたは調査メモを、会議に招く立場の提案リストに整理する編集者です。
- 15〜30件を出す。7つのグループ（direct/affected/decision_maker/implementer/funder/expert/overlooked）すべてに少なくとも1件。
- 既存のカタログ（id | 肩書き | カテゴリ）に合う立場は roleId にその id をそのまま入れ、newRole は null。合うものが無いときだけ roleId を null にして newRole（title=日本語の具体的な肩書き、category、sketch=その人の状況を1〜2文）を入れる。無理にカタログへ当てはめない。
- 「すでに選ばれている」と示された id は出さない。
- countryCode は、その立場が特定の国にいる場合のみISOコード（例 JP）。通常は null。
- reason は議題にとってなぜ重要か（1〜2文）、stakes は得るもの・失うもの（1文）。importance は議題への影響の大きさで high/medium/low。
- すべて日本語。`;

/** Convert raw model output to validated suggestions. Exported for tests. */
export function normalizeSuggestions(
  raw: z.infer<typeof suggestionSchema>["suggestions"],
  selected: Set<string>,
  countryCodes: string[],
  getRole: RoleResolver,
): StakeholderSuggestion[] {
  const out: StakeholderSuggestion[] = [];
  const seen = new Set<string>();
  for (const s of raw) {
    let roleId: string | undefined;
    let newRole: StakeholderSuggestion["newRole"];
    if (s.roleId && getRole(s.roleId)) roleId = s.roleId;
    else if (s.newRole?.title) newRole = { title: s.newRole.title, category: s.newRole.category, sketch: s.newRole.sketch };
    else continue;
    if (roleId && (selected.has(roleId) || seen.has(roleId))) continue;
    if (newRole) {
      if (seen.has("t:" + newRole.title)) continue;
      seen.add("t:" + newRole.title);
    }
    if (roleId) seen.add(roleId);
    const cc = s.countryCode && getCountry(s.countryCode) && countryCodes.includes(s.countryCode) ? s.countryCode : undefined;
    out.push({
      id: crypto.randomUUID(),
      group: s.group,
      roleId,
      newRole,
      countryCode: cc,
      reason: s.reason,
      stakes: s.stakes,
      importance: s.importance,
    });
  }
  return out;
}

export async function runDiscover(input: DiscoverInput): Promise<DiscoverResult> {
  const getRole = makeRoleResolver(input.customRoles);
  const meter = emptyUsage();
  const selected = new Set(input.selectedRoleIds);
  if (isMockMode()) return { suggestions: mockDiscover(input, getRole), usage: meter };

  const tier = input.modelTier;
  const researchModel = tier === "economy" ? S : O;
  const structModel = tier === "economy" ? H : S;
  const countries = input.countryCodes.map((c) => getCountry(c)?.name ?? c).join("、") || "日本";

  const notes = await webResearch({
    model: researchModel,
    system: RESEARCH_SYSTEM,
    user: [`## 議題\n${input.topic}`, input.background ? `## 背景\n${input.background}` : "", `## 想定する国・地域\n${countries}`].filter(Boolean).join("\n\n"),
    maxUses: 5,
    effort: "medium",
    meter,
    maxTokens: 10000,
  });

  const cat = catalog(input.customRoles)
    .map((r) => `${r.id} | ${r.title} | ${CATEGORY_LABELS[r.category]}(${r.category})`)
    .join("\n");
  const user = [
    `## 議題\n${input.topic}`,
    input.background ? `## 背景\n${input.background}` : "",
    `## 想定する国\n${input.countryCodes.join(", ") || "JP"}`,
    `## 調査メモ\n${notes.memo || "（調査メモなし。一般知識から洗い出してください）"}`,
    `## すでに選ばれている立場（出さない）\n${[...selected].join(", ") || "（なし）"}`,
    `## カタログ（id | 肩書き | カテゴリ）\n${cat}`,
  ]
    .filter(Boolean)
    .join("\n\n");
  const parsed = await parseStructured({
    model: structModel,
    system: STRUCT_SYSTEM,
    user,
    schema: suggestionSchema,
    effort: "low",
    meter,
    maxTokens: 12000,
  });
  if (!parsed) throw new Error("関係者の洗い出しに失敗しました。もう一度お試しください。");
  return { suggestions: normalizeSuggestions(parsed.suggestions, selected, input.countryCodes, getRole), usage: meter };
}

// ---------- mock ----------

function mockDiscover(input: DiscoverInput, getRole: RoleResolver): StakeholderSuggestion[] {
  const t = input.topic.trim().slice(0, 20) || "この議題";
  const selected = new Set(input.selectedRoleIds);
  const existing: [string, StakeholderGroup, StakeholderSuggestion["importance"]][] = [
    ["hs_student_general", "direct", "high"],
    ["parent_dual_income", "affected", "high"],
    ["mayor_city", "decision_maker", "high"],
    ["ministry_bureaucrat", "decision_maker", "medium"],
    ["hs_teacher", "implementer", "high"],
    ["town_office_staff", "implementer", "medium"],
    ["city_finance_official", "funder", "medium"],
    ["sme_owner", "funder", "low"],
    ["economist", "expert", "medium"],
    ["sociologist", "expert", "low"],
    ["disabled_self_advocate", "overlooked", "high"],
    ["elderly_resident", "overlooked", "medium"],
  ];
  const out: StakeholderSuggestion[] = [];
  for (const [id, group, importance] of existing) {
    if (!getRole(id) || selected.has(id)) continue;
    out.push({
      id: crypto.randomUUID(),
      group,
      roleId: id,
      reason: `「${t}」に関して、${getRole(id)!.title}の立場から現場の実感を語れるため。`,
      stakes: `${getRole(id)!.interests[0] ?? "日々の暮らし"}に直結する。`,
      importance,
    });
  }
  const news: { title: string; category: RoleCategory; sketch: string; group: StakeholderGroup; importance: StakeholderSuggestion["importance"] }[] = [
    { title: "地域の学童保育の指導員", category: "education", sketch: "放課後の子どもを預かる現場の担い手。人手不足と低待遇に悩む。", group: "implementer", importance: "high" },
    { title: "外国にルーツを持つ子の保護者", category: "family", sketch: "日本語の手続きに不安を抱え、情報が届きにくい家庭。", group: "overlooked", importance: "medium" },
    { title: "地元信用金庫の融資担当", category: "business", sketch: "地域の中小事業者の資金繰りと地域経済を見ている。", group: "funder", importance: "low" },
    { title: "将来世代の代弁を担う若手研究者", category: "expert", sketch: "20年後の負担と便益を試算し、世代間公平を訴える。", group: "overlooked", importance: "medium" },
  ];
  for (const n of news) {
    out.push({
      id: crypto.randomUUID(),
      group: n.group,
      newRole: { title: n.title, category: n.category, sketch: n.sketch },
      reason: `「${t}」では、${n.title}の視点が抜け落ちやすい。`,
      stakes: n.sketch,
      importance: n.importance,
    });
  }
  return out;
}
