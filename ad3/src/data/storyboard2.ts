// ===== KATALYS 広告(3本目・改訂版) "広告/求人コスト → SNSは資産" =====
// 新台本のデータ駆動ストーリーボード。Scene型は storyboard.ts を再利用。
import { Scene, FPS, WIDTH, HEIGHT } from "./storyboard";
export { FPS, WIDTH, HEIGHT };

const A = (n: string) => `ad3/assets/${n}`;

export const scenes2: Scene[] = [
  // S1 — 毎月いくら払ってる？（コスト流出）
  {
    id: 1, dur: 5, asset: A("v2_s1.png"), bg: "pale", motion: "zoomIn",
    telops: [
      { text: "広告と求人に", kind: "normal", delay: 0.3, color: "#15294B" },
      { text: "毎月いくら払ってる？", kind: "emphasis", delay: 0.6, size: 64, color: "#15294B" },
      { text: "そのお金、意味ある？", kind: "pain", delay: 2.6, size: 50, color: "#5b7aa6" },
    ],
  },
  // S2 — 止めたら消える / 何も残らない
  {
    id: 2, dur: 5, asset: A("v2_s2.png"), bg: "pale", motion: "zoomIn",
    telops: [
      { text: "止めたら、消える", kind: "normal", delay: 0.3, color: "#15294B" },
      { text: "手元に何も残らない", kind: "pain", delay: 0.6, size: 70, color: "#5b7aa6" },
    ],
  },
  // S3 — 同じ会社でも"ある状態"で選ばれ方が変わる
  {
    id: 3, dur: 6, asset: A("v2_s3.png"), bg: "white", motion: "zoomIn",
    telops: [
      { text: "同じ会社でも", kind: "normal", delay: 0.3, color: "#15294B" },
      { text: "選ばれ方が変わる", kind: "emphasis", delay: 0.6, size: 72, color: "#2B87E8" },
    ],
  },
  // S4 — 実績の数字 ＋ "資産"が積み上がる
  {
    id: 4, dur: 10, asset: A("v2_s4.png"), bg: "dark", motion: "zoomOut",
    telops: [
      { text: "広告費・求人費 0円", kind: "emphasis", delay: 0.2, size: 64, color: "#15294B", bandColor: "#CAE6FA" },
      { text: "SNSは“資産”になる", kind: "emphasis", delay: 8.0, size: 60, color: "#FFFFFF", bandColor: "rgba(43,135,232,0.35)" },
    ],
    numbers: [
      { start: 1.0, label: "フォロワー", value: 18, suffix: "万人" },
      { start: 3.4, label: "集客", value: 5.5, decimals: 1, suffix: "倍" },
      { start: 5.8, label: "応募", value: 200, suffix: "名" },
    ],
  },
  // S5 — 社長・スタッフの"人"が見える発信（既存 s5.png 流用）
  {
    id: 5, dur: 6, asset: A("s5.png"), bg: "white", motion: "zoomIn",
    telops: [
      { text: "特別なことはしていない", kind: "normal", delay: 0.3, size: 46, color: "#15294B" },
      { text: "人", kind: "emphasis", delay: 0.9, size: 150, color: "#2B87E8" },
      { text: "が見える発信だけ", kind: "normal", delay: 1.3, size: 50, color: "#15294B" },
    ],
  },
  // S6 — まずSNSで会社を調べる時代（既存 s7.png 流用）
  {
    id: 6, dur: 5, asset: A("s7.png"), bg: "pale", motion: "zoomIn",
    telops: [
      { text: "まずSNSで", kind: "normal", delay: 0.3 },
      { text: "会社を調べる時代", kind: "normal", delay: 0.5, size: 58, color: "#2B87E8" },
    ],
  },
  // S7 — 無料相談会 + CTA（既存 s9.png 流用）
  {
    id: 7, dur: 6, asset: A("s9.png"), bg: "white", motion: "zoomIn",
    telops: [
      { text: "無料相談会で", kind: "normal", delay: 0.3 },
      { text: "いっしょに考えます", kind: "normal", delay: 0.5, size: 58, color: "#2B87E8" },
    ],
    cta: { line1: "プロフィールTOPから", line2: "Check" },
  },
];

export const TOTAL_FRAMES2 = Math.round(
  scenes2.reduce((s, sc) => s + sc.dur, 0) * FPS
);
