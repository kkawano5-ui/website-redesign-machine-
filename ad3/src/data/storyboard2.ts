// ===== KATALYS 広告(3本目・改訂版v2) "広告/求人コスト → SNSは資産" =====
// 新台本のデータ駆動ストーリーボード。OpenAI TTS音声 (timing_43sec.json) と
// シーン尺・テロップ・数字の出現時刻を秒単位で同期させる。
// 音声側セグメント時刻はコメントに明記。Scene型は storyboard.ts を再利用。
import { Scene, FPS, WIDTH, HEIGHT } from "./storyboard";
export { FPS, WIDTH, HEIGHT };

const A = (n: string) => `ad3/assets/${n}`;

// 各シーンの起点(動画タイムライン上の絶対秒)。コメントに音声start/endを併記。
// 0.08 = LEAD 無音。
export const scenes2: Scene[] = [
  // ---- NS1 (0.0-7.0s) -- 問いかけ ----
  // 音声: "毎月、広告と求人にいくら払っていますか？" 0.08-3.50
  // 音声: "そのお金、本当に意味があるといえますか？" 3.80-6.89
  {
    id: 1, dur: 7, asset: A("v2_s1.png"), bg: "pale", motion: "zoomIn",
    telops: [
      { text: "広告と求人に", kind: "normal", delay: 0.3, color: "#15294B" },
      { text: "毎月いくら払ってる？", kind: "emphasis", delay: 0.8, size: 64, color: "#15294B" },
      { text: "そのお金、意味ある？", kind: "pain", delay: 3.7, size: 50, color: "#5b7aa6" },
    ],
  },

  // ---- NS2 (7.0-13.5s) -- 止めたら消える ----
  // 音声: "広告も求人媒体も、止めたら消えます。" 7.14-10.06
  // 音声: "毎月払い続けて、手元には何も残らない。" 10.21-13.27
  {
    id: 2, dur: 6.5, asset: A("v2_s2.png"), bg: "pale", motion: "zoomIn",
    telops: [
      { text: "止めたら、消える", kind: "normal", delay: 0.2, color: "#15294B" },
      { text: "手元に何も残らない", kind: "pain", delay: 3.1, size: 70, color: "#5b7aa6" },
    ],
  },

  // ---- NS3 (13.5-22.5s) -- 0円 + 数字3点 ----
  // 音声: "広告費ぜろえんで、フォロワーをじゅうはちまんにんまで増やし、集客はごてんごばい。" 13.87-19.22
  //   - "ぜろえん"   ≈ 13.9
  //   - "じゅうはちまんにん" ≈ 16.0
  //   - "ごてんごばい"     ≈ 18.5
  // 音声: "お金をかけずに、にひゃくめいの応募がきました。" 19.42-22.31
  //   - "にひゃくめい" ≈ 20.5
  {
    id: 3, dur: 9, asset: A("v2_s4.png"), bg: "dark", motion: "zoomOut",
    telops: [
      { text: "広告費 0円", kind: "emphasis", delay: 0.4, size: 72, color: "#15294B", bandColor: "#CAE6FA" },
    ],
    numbers: [
      { start: 2.5, label: "フォロワー", value: 18, suffix: "万人" },
      { start: 4.8, label: "集客",       value: 5.5, decimals: 1, suffix: "倍" },
      { start: 6.8, label: "応募",       value: 200, suffix: "名" },
    ],
  },

  // ---- NS4 (22.5-26.0s) -- "資産" ----
  // 音声: "エスエヌエスは、続けるほど、資産となります。" 22.56-25.57
  {
    id: 4, dur: 3.5, asset: A("v2_s3.png"), bg: "white", motion: "zoomIn",
    telops: [
      { text: "SNSは、続けるほど", kind: "normal", delay: 0.2, size: 50, color: "#15294B" },
      { text: "“資産”になる", kind: "emphasis", delay: 1.5, size: 84, color: "#2B87E8" },
    ],
  },

  // ---- NS5 (26.0-30.0s) -- "人"が見える発信 ----
  // 音声: "社長やスタッフの、人が見える発信を続けただけ。" 25.97-29.62
  //   - "社長やスタッフの" ≈ 26.0-27.3
  //   - "人が見える発信"   ≈ 27.5-29.0
  {
    id: 5, dur: 4, asset: A("s5.png"), bg: "white", motion: "zoomIn",
    telops: [
      { text: "社長やスタッフの", kind: "normal", delay: 0.0, size: 46, color: "#15294B" },
      { text: "人", kind: "emphasis", delay: 1.4, size: 150, color: "#2B87E8" },
      { text: "が見える発信", kind: "normal", delay: 2.0, size: 50, color: "#15294B" },
    ],
  },

  // ---- NS6 (30.0-35.0s) -- SNSで会社を調べる時代 ----
  // 音声: "お客さまも、これから働く人も、まず会社をエスエヌエスで調べる時代です。" 29.87-35.00
  //   - "お客さまも 働く人も"   ≈ 29.9-31.8
  //   - "まずSNSで"            ≈ 31.9-33.3
  //   - "会社を調べる時代"      ≈ 33.4-35.0
  {
    id: 6, dur: 5, asset: A("s7.png"), bg: "pale", motion: "zoomIn",
    telops: [
      { text: "お客様も、働く人も", kind: "normal", delay: 0.0, size: 46, color: "#15294B" },
      { text: "まずSNSで", kind: "normal", delay: 1.9, size: 54, color: "#15294B" },
      { text: "会社を調べる時代", kind: "emphasis", delay: 3.3, size: 60, color: "#2B87E8" },
    ],
  },

  // ---- NS7 (35.0-39.0s) -- 無料相談会 ----
  // 音声: "その始め方を、無料の相談会でお話ししています。" 35.35-38.70
  //   - "その始め方を" ≈ 35.4-36.4
  //   - "無料の相談会で" ≈ 36.4-37.7
  {
    id: 7, dur: 4, asset: A("s9.png"), bg: "white", motion: "zoomIn",
    telops: [
      { text: "その始め方は", kind: "normal", delay: 0.4, size: 50, color: "#15294B" },
      { text: "無料相談会で", kind: "emphasis", delay: 1.4, size: 64, color: "#2B87E8" },
    ],
  },

  // ---- NS8 (39.0-43.0s) -- CTA ----
  // 音声: "少しでも気になったら、プロフィールトップのリンクからチェック。" 39.00-42.47
  //   - "少しでも気になったら" ≈ 39.0-40.0
  //   - "プロフィールトップ"   ≈ 40.0-41.5
  //   - "チェック"            ≈ 41.5-42.5
  // Cta は SceneView 内で delay=1.2 ハードコード → 40.2s 表示 (= "プロフィール" 直後)
  {
    id: 8, dur: 4, asset: A("s9.png"), bg: "white", motion: "zoomIn",
    telops: [
      { text: "少しでも気になったら", kind: "normal", delay: 0.0, size: 50, color: "#15294B" },
    ],
    cta: { line1: "プロフィールTOPから", line2: "Check" },
  },
];

export const TOTAL_FRAMES2 = Math.round(
  scenes2.reduce((s, sc) => s + sc.dur, 0) * FPS
);
