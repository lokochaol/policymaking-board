# ビジュアルシステム（UI全体、会議室の内装は対象外）

方針：**白を基調にし、色は「意味」を伝えるときだけ使う。** 装飾のための色は使わない。会議室（SVG）の内装と色は今のまま変えない。

## パレット（ユーザー指定）
| トークン | HEX | 役割（意味） |
|---|---|---|
| `ink` | #50504E | 構造・本文・主ボタン・アイコン。色の意味を持たない「地」 |
| `coral` | #DE675F | **反対・否決・拒否・対立・エラー・取り消せない操作** |
| `yellow` | #FCE176 | **懸念・条件付き・注意・保留中の判断** |
| `blue` | #39789B | **進行・操作・情報**：現在のフェーズ、選択中の項目、リンク、フォーカス、タブ、進行役（議長）、事前調査 |
| `teal` | #81BDB1 | **賛成・合意・完了** |

### 派生色（CSS変数で定義）
- 背景 `--bg` #FFFFFF / 面 `--surface` #FFFFFF / くぼみ `--subtle` #F6F6F5 / 罫線 `--line` #E7E7E5 / 弱い文字 `--ink-2` #7A7A77 / さらに弱い `--ink-3` #A8A8A4
- 色ごとに薄い面（tint、約12%）と、文字に使える濃い色（strong）を持つ：
  - coral: tint #FBEAE8 / strong #B9473F
  - yellow: tint #FEF8DD / strong #8A6A00（黄色の上の文字は ink にする）
  - blue: tint #E6EFF4 / strong #2C6283
  - teal: tint #EAF4F2 / strong #3E8A7B
- 中立（neutral）は色を持たない：ink-3 の点、または subtle の面

## 意味の割り当て（このルール以外で色を使わない）
| 対象 | 割り当て |
|---|---|
| スタンス | strong_support = teal（塗り）/ support = teal（輪郭）/ neutral = ink-3 / concern = yellow / oppose = coral |
| 提案の状態 | agreed = teal / conditionally_agreed = yellow / both_views = 半分 teal・半分 coral のバッジ、または ink の輪郭 / deferred = ink-3 / rejected = coral / draft・discussing = blue の輪郭 |
| 納得度（consent 5〜1） | 5 = teal / 4 = teal 60% / 3 = yellow / 2 = coral 60% / 1 = coral。棒グラフの色もこれに合わせる |
| 重要なやりとり | conflict = coral / concession・alliance = teal / tradeoff・reframe = blue / breakthrough = yellow |
| 事前調査の状態 | researching = blue（点滅）/ done = teal / failed = coral |
| フェーズの進捗 | 済み = ink-3 のチェック / 現在 = blue / これから = line |
| 開示レベル | 色は使わない。ink の輪郭バッジ＋アイコン（公開 📢 → 地球、非公開 → 扉、チャタム → 吹き出し、オフレコ → 鍵）。色を足すとスタンスの意味とぶつかるため |
| 主ボタン | ink の塗り＋白文字。開会・閉会など最重要の操作だけ。二次的な操作は輪郭ボタン。退席・削除は coral の文字 |
| エラー・警告 | エラー = coral の tint の面＋strong の文字、警告 = yellow の tint |
| 費用 | ink-2 の小さな数字（色なし） |

## タイポグラフィと形
- フォントは Noto Sans JP に統一する（見出しも同じ書体で、太さで差をつける）。丸ゴシックはやめる
- 文字サイズ：12 / 13 / 14（本文）/ 16 / 20 / 28。行間 1.7
- 角丸：小 6px（バッジ・入力）/ 中 10px（カード）/ 大 14px（パネル）
- 影：ほぼ使わない。カードは罫線 1px（line）。浮かせる要素（ポップオーバー、固定バー）だけ `0 4px 16px rgba(0,0,0,.06)`
- 余白：8px グリッド。カードの内側 16〜20px
- アイコン：絵文字はやめ、線のアイコンにする（インラインSVGで最小限。lucide 風の 1.5px の線）
- 凡例：スタンス・納得度の色を使う画面には、必ず小さな凡例を置く
