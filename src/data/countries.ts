import type { Country } from "@/lib/types";

// STUB: to be expanded to ~15 countries by the data agent.
export const COUNTRIES: Country[] = [
  {
    code: "JP",
    name: "日本",
    flag: "🇯🇵",
    context: "少子高齢化と人口減少が進み、地方の公共サービスの維持が課題。合意を重んじ、根回しの文化がある。",
    givenNames: { male: ["健太", "大輔", "翔", "誠", "浩二", "蓮"], female: ["美咲", "陽子", "結衣", "恵子", "さくら", "葵"] },
    familyNames: ["佐藤", "鈴木", "高橋", "田中", "伊藤", "渡辺", "山本", "中村"],
    skinTones: [1, 2],
    speechNote: "日本的な遠回しな言い方や配慮の表現が出やすい。",
  },
];

export function getCountry(code: string): Country | undefined {
  return COUNTRIES.find((c) => c.code === code);
}
