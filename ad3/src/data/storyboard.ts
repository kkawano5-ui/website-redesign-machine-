// ===== KATALYS 広告(3本目) データ駆動ストーリーボード =====
// テロップ・尺・アニメーション・素材パスをここで一元管理する。
// 画像は ChatGPT/gpt-image で生成し public/ad3/assets/ に同名で配置する。
// （日本語テロップ・数字・CTA はコード側で後乗せ。AI画像内に文字は入れない）

export const FPS = 30;
export const WIDTH = 1080;
export const HEIGHT = 1920;

export type TelopKind = "normal" | "pain" | "relief" | "emphasis";
export type Motion = "zoomIn" | "zoomOut" | "panUp" | "parallax" | "none";
export type BgKind = "dark" | "pale" | "white";
export type EnterKind = "slideUp" | "slideLeft" | "slideRight" | "pop" | "fade";

export interface Telop {
  text: string;
  kind: TelopKind;
  delay: number;        // sec from scene start
  color?: string;       // override text color
  size?: number;        // px
  bandColor?: string;   // emphasis band color override
}

export interface Overlay {
  asset: string;        // staticFile path under public/
  enter: EnterKind;
  delay: number;        // sec
  xPct: number;         // center x (% of width)
  yPct: number;         // center y (% of height)
  wPct: number;         // width (% of width)
  dim?: number;         // 0..1 opacity multiplier (for "uncertain" cards)
  float?: boolean;      // gentle floating loop
}

export interface NumberStat {
  start: number;        // sec from scene start
  label?: string;       // small label above (e.g. フォロワー)
  value: number;        // count-up target
  suffix: string;       // unit (万人 / 万回再生 / 本以上)
}

export interface Scene {
  id: number;
  dur: number;          // sec
  asset: string;        // base full-bleed ChatGPT illustration
  bg: BgKind;
  bgFrom?: BgKind;      // transition source (e.g. scene3 dark->pale)
  motion: Motion;
  light?: boolean;      // soft light wash (relief)
  veil?: boolean;       // gray veil that clears (scene8)
  overlays?: Overlay[];
  telops: Telop[];
  numbers?: NumberStat[];
  cta?: { line1: string; line2: string };
}

const A = (n: string) => `ad3/assets/${n}`;

export const scenes: Scene[] = [
  // 1 — ペイン導入
  {
    id: 1, dur: 4, asset: A("s1.png"), bg: "dark", motion: "zoomIn",
    telops: [
      { text: "投稿してるのに", kind: "normal", delay: 0.3 },
      { text: "伸びない…", kind: "pain", delay: 0.6, size: 96, color: "#8FB7E6" },
    ],
  },
  // 2 — 自責
  {
    id: 2, dur: 4, asset: A("s2.png"), bg: "dark", motion: "panUp",
    // base art already includes the post cards + calendar
    telops: [
      { text: "自分のやり方が", kind: "normal", delay: 0.3 },
      { text: "悪いのかな？", kind: "pain", delay: 0.5, size: 88, color: "#8FB7E6" },
    ],
  },
  // 3 — 救い
  {
    id: 3, dur: 4, asset: A("s3.png"), bg: "pale", bgFrom: "dark", motion: "zoomIn", light: true,
    telops: [
      { text: "でも、大丈夫", kind: "relief", delay: 0.5, size: 84, color: "#15294B" },
      { text: "努力不足じゃない", kind: "relief", delay: 0.85, size: 62, color: "#216CC4" },
    ],
  },
  // 4 — 原因の再定義
  {
    id: 4, dur: 5, asset: A("s4.png"), bg: "pale", motion: "none",
    // base art already includes the three cards
    telops: [
      { text: "伸びる理由は", kind: "normal", delay: 0.25 },
      { text: "そこじゃない", kind: "normal", delay: 0.45, size: 80, color: "#2B87E8" },
    ],
  },
  // 5 — 答え（人）
  {
    id: 5, dur: 6, asset: A("s5.png"), bg: "white", motion: "zoomIn",
    // optional: add s5_ceo/staff/site transparent cards to slide in (see docs)
    telops: [
      { text: "SNSに", kind: "normal", delay: 0.25, color: "#15294B" },
      { text: "人", kind: "emphasis", delay: 0.7, size: 150, color: "#2B87E8" },
      { text: "が見えているか", kind: "normal", delay: 1.05, size: 52, color: "#15294B" },
    ],
  },
  // 6 — 実績
  {
    id: 6, dur: 8, asset: A("s6.png"), bg: "dark", motion: "zoomOut",
    telops: [
      { text: "広告費 0円", kind: "emphasis", delay: 0.2, size: 76, color: "#15294B", bandColor: "#CAE6FA" },
    ],
    numbers: [
      { start: 1.2, label: "フォロワー", value: 18, suffix: "万人" },
      { start: 3.6, value: 100, suffix: "万回再生" },
      { start: 5.8, value: 50, suffix: "本以上" },
    ],
  },
  // 7 — SNSで会社を調べる時代
  {
    id: 7, dur: 5, asset: A("s7.png"), bg: "pale", motion: "zoomIn",
    // optional: add s7_empty/s7_warm transparent profile cards into the phones (see docs)
    telops: [
      { text: "今は、まずSNSで", kind: "normal", delay: 0.25 },
      { text: "会社を調べる時代", kind: "normal", delay: 0.45, size: 60, color: "#2B87E8" },
    ],
  },
  // 8 — もったいない
  {
    id: 8, dur: 5, asset: A("s8.png"), bg: "pale", motion: "zoomIn", veil: true,
    // veil clears to reveal the company (base art). optional: add s8_reveal cards (see docs)
    telops: [
      { text: "良さが伝わらないのは", kind: "normal", delay: 0.25, size: 46 },
      { text: "もったいない", kind: "emphasis", delay: 0.55, size: 74, color: "#F59648", bandColor: "rgba(245,150,72,0.16)" },
    ],
  },
  // 9 — CTA
  {
    id: 9, dur: 4, asset: A("s9.png"), bg: "white", motion: "zoomIn",
    telops: [
      { text: "無料相談会で", kind: "normal", delay: 0.2 },
      { text: "一緒に考えます", kind: "normal", delay: 0.4, size: 60, color: "#2B87E8" },
    ],
    cta: { line1: "プロフィールTOPから", line2: "無料相談会へ" },
  },
];

export const TOTAL_FRAMES = Math.round(
  scenes.reduce((s, sc) => s + sc.dur, 0) * FPS
);

// 画像→動画AI(Runway/Kling等)で作った 3〜5秒ループクリップを
// public/ad3/assets/s<id>.mp4 として置いたら、その scene id をここに追加する。
// 追加されたシーンは静止画の代わりに動画クリップを背景に使う（テロップ等は上に乗る）。
// 例: [1, 3, 6] → S1/S3/S6 が動画になる。空なら全て静止画のまま。
export const SCENES_WITH_VIDEO: number[] = [];
