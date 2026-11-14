import type { RoleTemplate, RoleCategory } from "@/lib/types";

export const CATEGORY_LABELS: Record<RoleCategory, string> = {
  youth: "学生・若者",
  education: "教育",
  family: "家庭・地域",
  local_gov: "地方行政",
  national_gov: "国政",
  business: "企業経営",
  worker: "働く人",
  tech: "技術者",
  health: "医療・福祉",
  civil: "市民社会",
  primary: "農林水産",
  expert: "専門家",
};

// STUB: to be expanded to 100+ roles by the data agent.
export const ROLES: RoleTemplate[] = [
  {
    id: "jhs_student",
    category: "youth",
    title: "公立中学校の2年生",
    shortTitle: "中学生",
    ageRange: [13, 14],
    outfit: "school_uniform_jhs",
    accessory: "none",
    description: "地方の公立中学校に通う2年生。部活と塾で毎日忙しい。将来の進路はまだはっきりしていない。",
    interests: ["友達と過ごす時間", "部活を続けたい", "自分の意見を聞いてほしい"],
    concerns: ["大人だけで決められること", "受験", "親の負担"],
    privateConcerns: ["本当は部活が少しつらい", "先生に目をつけられたくない"],
    constraints: ["大人の前では遠慮しがち", "専門用語がわからない"],
    speechStyle: "短く、素直な口語。「〜だと思います」「正直〜」。たまに言葉に詰まる。",
    influence: 5,
    expertise: 10,
  },
  {
    id: "bus_driver",
    category: "worker",
    title: "路線バスの運転手",
    shortTitle: "バス運転手",
    ageRange: [35, 62],
    outfit: "uniform_driver",
    accessory: "cap",
    description: "地方の路線バス会社で20年近く運転している。早朝から深夜までのシフト勤務。乗客の多くは高齢者と学生。",
    interests: ["安定した雇用と給料", "無理のない勤務時間", "乗客の安全"],
    concerns: ["人手不足で休みが取れない", "路線の廃止", "自動運転で仕事がなくなる"],
    privateConcerns: ["体力的に限界を感じている", "会社の経営が危ういと聞いている"],
    constraints: ["会社の方針に公然と反対しにくい", "労働組合の立場もある"],
    speechStyle: "現場の言葉で率直に。具体的なエピソードを交える。役所言葉は使わない。",
    influence: 15,
    expertise: 30,
  },
];

export function getRole(id: string): RoleTemplate | undefined {
  return ROLES.find((r) => r.id === id);
}
