// ===== KATALYS 広告(3本目・改訂版v2-b) 新ナレーション(36.86s)に同期 =====
// 音声 94f1b4ac…mp4 の無音検出(発話区切り)に合わせてシーン尺を設定。
import { Scene, FPS, WIDTH, HEIGHT } from "./storyboard";
export { FPS, WIDTH, HEIGHT };

const A = (n: string) => `ad3/assets/${n}`;

// 各シーンの尺(秒)は音声の発話区切りに対応（合計 36.8627s）
export const scenes2: Scene[] = [
  // 1) 毎月いくら払ってる？ (0.0–7.5)
  {
    id: 1, dur: 7.5, asset: A("v2_s1.png"), bg: "pale", motion: "zoomIn",
    telops: [
      { text: "広告と求人に", kind: "normal", delay: 0.5, color: "#15294B" },
      { text: "毎月いくら払ってる？", kind: "emphasis", delay: 0.9, size: 64, color: "#15294B" },
      { text: "そのお金、意味ある？", kind: "pain", delay: 4.2, size: 50, color: "#5b7aa6" },
    ],
  },
  // 2) 止めれば消える / 何も残らない (7.5–10.5)
  {
    id: 2, dur: 3.0, asset: A("v2_s2.png"), bg: "pale", motion: "zoomIn",
    telops: [
      { text: "止めれば、消える", kind: "normal", delay: 0.25, color: "#15294B" },
      { text: "手元に何も残らない", kind: "pain", delay: 0.55, size: 64, color: "#5b7aa6" },
    ],
  },
  // 3) でも、SNSは"資産"になる (10.5–13.3)
  {
    id: 3, dur: 2.8, asset: A("v2_s3.png"), bg: "white", motion: "zoomIn",
    telops: [
      { text: "でも、SNSは", kind: "normal", delay: 0.25, color: "#15294B" },
      { text: "“資産”になる", kind: "emphasis", delay: 0.55, size: 72, color: "#2B87E8" },
    ],
  },
  // 4) 実績の数字 (13.3–19.4)
  {
    id: 4, dur: 6.1, asset: A("v2_s4.png"), bg: "dark", motion: "zoomOut",
    telops: [
      { text: "広告費 0円", kind: "emphasis", delay: 0.2, size: 60, color: "#15294B", bandColor: "#CAE6FA" },
    ],
    numbers: [
      { start: 0.9, label: "フォロワー", value: 18, suffix: "万人" },
      { start: 2.7, label: "集客", value: 5.5, decimals: 1, suffix: "倍" },
      { start: 4.4, label: "応募", value: 200, suffix: "名" },
    ],
  },
  // 5) 特別なことはしていない / "人"が見える発信 (19.4–24.0)
  {
    id: 5, dur: 4.6, asset: A("s5.png"), bg: "white", motion: "zoomIn",
    telops: [
      { text: "特別なことはしていない", kind: "normal", delay: 0.3, size: 46, color: "#15294B" },
      { text: "人", kind: "emphasis", delay: 1.4, size: 150, color: "#2B87E8" },
      { text: "が見える発信だけ", kind: "normal", delay: 1.8, size: 50, color: "#15294B" },
    ],
  },
  // 6) まずSNSで会社を調べる時代 (24.0–28.2)
  {
    id: 6, dur: 4.2, asset: A("s7.png"), bg: "pale", motion: "zoomIn",
    telops: [
      { text: "まずSNSで", kind: "normal", delay: 0.3 },
      { text: "会社を調べる時代", kind: "normal", delay: 0.55, size: 58, color: "#2B87E8" },
    ],
  },
  // 7) "人"が見えるだけで選ばれる会社に (28.2–31.2)
  {
    id: 7, dur: 3.0, asset: A("v2_s3.png"), bg: "white", motion: "zoomIn",
    telops: [
      { text: "人が見えるだけで", kind: "normal", delay: 0.3, size: 50, color: "#15294B" },
      { text: "選ばれる会社に", kind: "emphasis", delay: 0.7, size: 64, color: "#2B87E8" },
    ],
  },
  // 8) 無料の相談会で (31.2–34.3)
  {
    id: 8, dur: 3.1, asset: A("s9.png"), bg: "white", motion: "zoomIn",
    telops: [
      { text: "無料相談会で", kind: "normal", delay: 0.3 },
      { text: "お話ししています", kind: "normal", delay: 0.55, size: 56, color: "#2B87E8" },
    ],
  },
  // 9) CTA (34.3–36.86)
  {
    id: 9, dur: 2.5627, asset: A("s9.png"), bg: "white", motion: "zoomIn",
    telops: [
      { text: "気になったら", kind: "normal", delay: 0.2, size: 44, color: "#15294B" },
    ],
    cta: { line1: "プロフィールTOPから", line2: "Check！" },
  },
];

export const TOTAL_FRAMES2 = Math.round(
  scenes2.reduce((s, sc) => s + sc.dur, 0) * FPS
);
