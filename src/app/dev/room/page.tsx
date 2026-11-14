"use client";

import { useMemo, useState } from "react";
import Avatar from "@/components/room/Avatar";
import Room from "@/components/room/Room";
import type { Expression } from "@/components/room/types";
import { ROLES } from "@/data/roles";
import type { Accessory, AvatarSpec, Outfit, Participant, RoomTheme, Stance } from "@/lib/types";

const OUTFITS: Outfit[] = [
  "school_uniform_jhs", "school_uniform_hs", "casual", "suit", "suit_formal", "office_casual", "uniform_driver",
  "work_jacket", "lab_coat", "scrubs", "apron", "farm", "hoodie", "cardigan", "uniform_police",
];
const EXPRESSIONS: Expression[] = ["neutral", "smile", "concern", "frown", "thinking", "surprised"];
const COLORS = ["#2f3f66", "#3f6f5a", "#7a3b3b", "#c46a2c", "#2c6f8f", "#5a4a8a", "#444b55", "#8a6a2c"];
const HAIR = ["#1c1512", "#3a2616", "#6a4a2a", "#a8742c", "#2a2a30", "#8a3a2a"];
const ACC: Accessory[] = ["none", "glasses", "badge", "sash", "cap", "helmet", "headset", "stethoscope", "laptop", "clipboard", "name_lanyard"];
const STANCES: Stance[] = ["strong_support", "support", "neutral", "concern", "oppose"];
const THEMES: RoomTheme[] = ["council_chamber", "roundtable_hall", "townhall", "backroom", "cabinet_room"];
const NAMES = ["佐藤 健太", "鈴木 美咲", "高橋 大輔", "田中 陽子", "伊藤 翔", "渡辺 結衣", "山本 誠", "中村 恵子", "小林 蓮", "加藤 葵", "吉田 浩二", "山田 さくら"];

const OUTFIT_ACC: Partial<Record<Outfit, Accessory>> = {
  hoodie: "laptop", lab_coat: "stethoscope", suit_formal: "badge", work_jacket: "helmet", cardigan: "name_lanyard", uniform_driver: "cap", farm: "cap",
};

function makeSpec(i: number, outfit: Outfit): AvatarSpec {
  return {
    skinTone: (i * 5) % 6,
    hairStyle: i % 8,
    hairColor: HAIR[i % HAIR.length],
    gender: i % 2 === 0 ? "male" : "female",
    age: [14, 17, 29, 38, 45, 52, 61, 68, 33, 24, 71, 41][i % 12],
    outfit,
    outfitColor: outfit === "school_uniform_hs" || outfit === "school_uniform_jhs" ? "#26325a" : COLORS[(i * 3) % COLORS.length],
    accessory: OUTFIT_ACC[outfit] ?? ACC[(i * 2) % ACC.length],
    glasses: i % 4 === 1,
  };
}

function makeParticipants(n: number): Participant[] {
  return Array.from({ length: n }, (_, i) => {
    const outfit = OUTFITS[(i * 4 + (i > 6 ? 1 : 0)) % OUTFITS.length];
    const role = ROLES.find((r) => r.outfit === outfit) ?? ROLES[i % ROLES.length];
    return {
      id: `p${i}`,
      roleId: role?.id ?? "x",
      countryCode: "JP",
      name: NAMES[i % NAMES.length],
      age: 30,
      personality: "",
      avatar: makeSpec(i, outfit),
      seatIndex: i,
      isFacilitator: i === 0,
    };
  });
}

const BUBBLE =
  "ご指摘の点は理解しますが、現場の実情としては予算と人手の両面で厳しく、段階的な導入を提案したいと考えています。まずは小さく試して、結果を見ながら範囲を広げていく進め方はいかがでしょうか。";

const COUNTS: Record<RoomTheme, number> = { council_chamber: 9, roundtable_hall: 12, townhall: 10, backroom: 6, cabinet_room: 12 };

export default function DevRoomPage() {
  const [speaking, setSpeaking] = useState(true);
  const [thoughts, setThoughts] = useState(false);
  const [selected, setSelected] = useState<string | undefined>("p2");
  const [only, setOnly] = useState<RoomTheme | "all">("all");
  const [clicked, setClicked] = useState("");

  const sets = useMemo(() => {
    const r = {} as Record<RoomTheme, Participant[]>;
    THEMES.forEach((t) => (r[t] = makeParticipants(COUNTS[t])));
    return r;
  }, []);

  const stances = useMemo(() => {
    const s: Record<string, Stance> = {};
    for (let i = 0; i < 16; i++) s[`p${i}`] = STANCES[i % STANCES.length];
    return s;
  }, []);
  const thoughtMap = useMemo(() => {
    const t: Record<string, string> = {};
    for (let i = 0; i < 16; i++) t[`p${i}`] = ["本音ではコストが心配…", "この案なら通せそうだ。", "上には何と説明しよう。", "若い世代の声も聞きたい。"][i % 4];
    return t;
  }, []);

  return (
    <main style={{ padding: 16, maxWidth: 1400, margin: "0 auto", background: "#f4f1ea", minHeight: "100vh", color: "#222" }}>
      <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 8 }}>会議室ビジュアル プレビュー</h1>
      <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginBottom: 12, alignItems: "center" }}>
        <label><input type="checkbox" checked={speaking} onChange={(e) => setSpeaking(e.target.checked)} /> 発言中（吹き出し）</label>
        <label><input type="checkbox" checked={thoughts} onChange={(e) => setThoughts(e.target.checked)} /> 本音（思考の雲）</label>
        <select value={only} onChange={(e) => setOnly(e.target.value as RoomTheme | "all")} data-testid="theme-select">
          <option value="all">全テーマ</option>
          {THEMES.map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
        <span style={{ fontSize: 13 }}>クリック: {clicked || "-"}</span>
      </div>

      {THEMES.filter((t) => only === "all" || only === t).map((t) => (
        <section key={t} data-theme={t} style={{ marginBottom: 28 }}>
          <h2 style={{ fontSize: 16, fontWeight: 600, margin: "8px 0" }}>{t}（{COUNTS[t]}人）</h2>
          <div style={{ borderRadius: 12, overflow: "hidden", boxShadow: "0 4px 18px rgba(0,0,0,0.25)" }}>
            <Room
              theme={t}
              participants={sets[t]}
              speakingId={speaking ? "p3" : undefined}
              bubbleText={speaking ? BUBBLE : undefined}
              stances={stances}
              thoughts={thoughtMap}
              showThoughts={thoughts}
              boardTitle={t === "townhall" ? "〇〇市 タウンミーティング" : "第2回 地域交通のあり方"}
              boardSubtitle="論点整理フェーズ"
              selectedId={selected}
              onSeatClick={(id) => {
                setSelected(id);
                setClicked(id);
              }}
            />
          </div>
        </section>
      ))}

      <h2 style={{ fontSize: 16, fontWeight: 600, margin: "16px 0 8px" }}>アバター: 服装 × 表情</h2>
      <div style={{ overflowX: "auto", background: "#fff", borderRadius: 12, padding: 12 }}>
        <table style={{ borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th />
              {EXPRESSIONS.map((e) => (
                <th key={e} style={{ fontSize: 12, padding: 4 }}>{e}</th>
              ))}
              <th style={{ fontSize: 12 }}>speaking</th>
            </tr>
          </thead>
          <tbody>
            {OUTFITS.map((o, oi) => (
              <tr key={o}>
                <td style={{ fontSize: 11, paddingRight: 8, whiteSpace: "nowrap" }}>{o}</td>
                {EXPRESSIONS.map((e, ei) => (
                  <td key={e} style={{ padding: 2, background: "#e9edf3", borderRight: "2px solid #fff" }}>
                    <Avatar
                      participant={{ ...makeParticipants(1)[0], id: `g${oi}-${ei}`, avatar: makeSpec(oi * 2 + ei, o) }}
                      expression={e}
                      scale={0.75}
                    />
                  </td>
                ))}
                <td style={{ padding: 2, background: "#e9edf3" }}>
                  <Avatar participant={{ ...makeParticipants(1)[0], id: `s${oi}`, avatar: makeSpec(oi * 3 + 1, o) }} expression="smile" speaking scale={0.75} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h2 style={{ fontSize: 16, fontWeight: 600, margin: "16px 0 8px" }}>髪型 × 年齢（60px級）</h2>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", background: "#fff", padding: 12, borderRadius: 12 }}>
        {Array.from({ length: 16 }, (_, i) => (
          <Avatar
            key={i}
            participant={{ ...makeParticipants(1)[0], id: `h${i}`, avatar: { ...makeSpec(i, OUTFITS[i % OUTFITS.length]), hairStyle: i % 8, age: [20, 45, 65, 35][Math.floor(i / 4)], gender: i % 3 === 0 ? "female" : "male" } }}
            scale={0.4}
            expression="smile"
          />
        ))}
      </div>
    </main>
  );
}
