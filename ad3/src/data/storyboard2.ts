// ===== KATALYS 広告(3本目・改訂版v2-b) 新ナレーション(36.86s)に同期 =====
// 音声 94f1b4ac…mp4 の無音検出(発話区切り)に合わせてシーン尺を設定。
import { Scene, FPS, WIDTH, HEIGHT } from "./storyboard";
export { FPS, WIDTH, HEIGHT };

const A = (n: string) => `ad3/assets/${n}`;

// あなたの提供音声(36.86s)の発話区切り(実測)に完全同期。合計 36.8627s。
export const scenes2New: Scene[] = [
  // 1) 毎月、広告や求人にいくら払っていますか？ (0.00–2.97)
  { id: 1, dur: 2.97, asset: A("v2_s1.png"), bg: "pale", motion: "zoomIn",
    telops: [
      { text: "広告や求人に", kind: "normal", delay: 0.2, color: "#15294B" },
      { text: "毎月いくら払ってる？", kind: "emphasis", delay: 0.5, size: 58, color: "#15294B" },
    ] },
  // 2) 止めれば消える…手元には何も残りません。 (2.97–7.63)
  { id: 2, dur: 4.66, asset: A("v2_s2.png"), bg: "pale", motion: "zoomIn",
    telops: [
      { text: "止めれば、消える", kind: "normal", delay: 0.3, color: "#15294B" },
      { text: "手元に何も残らない", kind: "pain", delay: 1.7, size: 64, color: "#5b7aa6" },
    ] },
  // 3) でも、SNSは続けるほど"資産"になります。 (7.63–10.68)
  { id: 3, dur: 3.05, asset: A("v2_s3.png"), bg: "white", motion: "zoomIn",
    telops: [
      { text: "でも、SNSは", kind: "normal", delay: 0.3, color: "#15294B" },
      { text: "“資産”になる", kind: "emphasis", delay: 0.9, size: 72, color: "#2B87E8" },
    ] },
  // 4) 広告費0円でフォロワー18万人、集客5.5倍 (10.68–15.50) ※18万≈13.0 / 5.5倍≈15.0
  { id: 4, dur: 4.82, asset: A("v2_s4.png"), bg: "dark", motion: "zoomOut",
    telops: [
      { text: "広告費 0円", kind: "emphasis", delay: 0.3, size: 58, color: "#15294B", bandColor: "#CAE6FA" },
    ],
    numbers: [
      { start: 2.3, label: "フォロワー", value: 18, suffix: "万人" },
      { start: 4.0, label: "集客", value: 5.5, decimals: 1, suffix: "倍" },
    ] },
  // 5) 求人媒体に頼らず、200名の応募。 (15.50–19.49) ※200名≈17.3
  { id: 5, dur: 3.99, asset: A("v2_s4.png"), bg: "dark", motion: "zoomOut",
    telops: [
      { text: "求人に頼らず", kind: "normal", delay: 0.2, size: 46, color: "#FFFFFF" },
    ],
    numbers: [
      { start: 1.8, label: "応募", value: 200, suffix: "名" },
    ] },
  // 6) 特別なことはしていません。 (19.49–21.05)
  { id: 6, dur: 1.56, asset: A("s5.png"), bg: "white", motion: "zoomIn",
    telops: [
      { text: "特別なことはしていない", kind: "normal", delay: 0.2, size: 50, color: "#15294B" },
    ] },
  // 7) 社長やスタッフの"人"が見える発信。 (21.05–24.10)
  { id: 7, dur: 3.05, asset: A("s5.png"), bg: "white", motion: "zoomIn",
    telops: [
      { text: "人", kind: "emphasis", delay: 0.4, size: 150, color: "#2B87E8" },
      { text: "が見える発信だけ", kind: "normal", delay: 0.9, size: 50, color: "#15294B" },
    ] },
  // 8) お客さまも、まず会社をSNSで調べる時代。 (24.10–28.34)
  { id: 8, dur: 4.24, asset: A("s7.png"), bg: "pale", motion: "zoomIn",
    telops: [
      { text: "まずSNSで", kind: "normal", delay: 0.3 },
      { text: "会社を調べる時代", kind: "normal", delay: 0.6, size: 58, color: "#2B87E8" },
    ] },
  // 9) そこで"人"が見えるだけで、選ばれる会社に。 (28.34–31.34)
  { id: 9, dur: 3.00, asset: A("v2_s3.png"), bg: "white", motion: "zoomIn",
    telops: [
      { text: "人が見えるだけで", kind: "normal", delay: 0.3, size: 50, color: "#15294B" },
      { text: "選ばれる会社に", kind: "emphasis", delay: 0.7, size: 64, color: "#2B87E8" },
    ] },
  // 10) その始め方を、無料の相談会で。 (31.34–34.41)
  { id: 10, dur: 3.07, asset: A("s9.png"), bg: "white", motion: "zoomIn",
    telops: [
      { text: "無料相談会で", kind: "normal", delay: 0.3 },
      { text: "お話ししています", kind: "normal", delay: 0.6, size: 56, color: "#2B87E8" },
    ] },
  // 11) 気になったら、プロフィールTOPからCheck！ (34.41–36.86)
  { id: 11, dur: 2.4527, asset: A("s9.png"), bg: "white", motion: "zoomIn",
    telops: [
      { text: "気になったら", kind: "normal", delay: 0.2, size: 44, color: "#15294B" },
    ],
    cta: { line1: "プロフィールTOPから", line2: "Check！" } },
];

// 旧（音声下書き）版は保持しつつ、本番は新台本版を使う
const _legacy: Scene[] = [
  // 1) 毎月いくら払ってる？ (0.0–2.9) … 音声「毎月、広告と求人にいくら払っていますか？」
  {
    id: 1, dur: 2.9, asset: A("v2_s1.png"), bg: "pale", motion: "zoomIn",
    telops: [
      { text: "広告と求人に", kind: "normal", delay: 0.2, color: "#15294B" },
      { text: "毎月いくら払ってる？", kind: "emphasis", delay: 0.5, size: 60, color: "#15294B" },
    ],
  },
  // 2) そのお金、意味ある？ (2.9–7.5) … 音声「そのお金、本当に意味があるといえますか？」
  {
    id: 2, dur: 4.6, asset: A("v2_s1.png"), bg: "pale", motion: "zoomIn",
    telops: [
      { text: "そのお金、本当に", kind: "normal", delay: 0.2, color: "#15294B" },
      { text: "意味ある？", kind: "pain", delay: 0.5, size: 70, color: "#5b7aa6" },
    ],
  },
  // 3) 止めたら消える (7.5–10.5) … 音声「広告も求人媒体も、止めたら消えます。」
  {
    id: 3, dur: 3.0, asset: A("v2_s2.png"), bg: "pale", motion: "zoomIn",
    telops: [
      { text: "広告も求人も", kind: "normal", delay: 0.2, color: "#15294B" },
      { text: "止めたら、消える", kind: "emphasis", delay: 0.5, size: 64, color: "#15294B" },
    ],
  },
  // 4) 手元に何も残らない (10.5–13.3) … 音声「毎月払い続けて、手元には何も残らない。」
  {
    id: 4, dur: 2.8, asset: A("v2_s2.png"), bg: "pale", motion: "zoomIn",
    telops: [
      { text: "手元には", kind: "normal", delay: 0.2, color: "#15294B" },
      { text: "何も残らない", kind: "pain", delay: 0.45, size: 70, color: "#5b7aa6" },
    ],
  },
  // 5) 実績の数字 (13.3–19.4) ※数値はこの区間でOK
  {
    id: 5, dur: 6.1, asset: A("v2_s4.png"), bg: "dark", motion: "zoomOut",
    telops: [
      { text: "広告費 0円", kind: "emphasis", delay: 0.2, size: 60, color: "#15294B", bandColor: "#CAE6FA" },
    ],
    numbers: [
      { start: 0.9, label: "フォロワー", value: 18, suffix: "万人" },
      { start: 2.7, label: "集客", value: 5.5, decimals: 1, suffix: "倍" },
      { start: 4.4, label: "応募", value: 200, suffix: "名" },
    ],
  },
  // 6) 特別なことはしていない / "人"が見える発信 (19.4–24.0)
  {
    id: 6, dur: 4.6, asset: A("s5.png"), bg: "white", motion: "zoomIn",
    telops: [
      { text: "特別なことはしていない", kind: "normal", delay: 0.3, size: 46, color: "#15294B" },
      { text: "人", kind: "emphasis", delay: 1.4, size: 150, color: "#2B87E8" },
      { text: "が見える発信だけ", kind: "normal", delay: 1.8, size: 50, color: "#15294B" },
    ],
  },
  // 7) まずSNSで会社を調べる時代 (24.0–28.2)
  {
    id: 7, dur: 4.2, asset: A("s7.png"), bg: "pale", motion: "zoomIn",
    telops: [
      { text: "まずSNSで", kind: "normal", delay: 0.3 },
      { text: "会社を調べる時代", kind: "normal", delay: 0.55, size: 58, color: "#2B87E8" },
    ],
  },
  // 8) "人"が見えるだけで選ばれる会社に (28.2–31.2)
  {
    id: 8, dur: 3.0, asset: A("v2_s3.png"), bg: "white", motion: "zoomIn",
    telops: [
      { text: "人が見えるだけで", kind: "normal", delay: 0.3, size: 50, color: "#15294B" },
      { text: "選ばれる会社に", kind: "emphasis", delay: 0.7, size: 64, color: "#2B87E8" },
    ],
  },
  // 9) 無料の相談会で (31.2–34.3)
  {
    id: 9, dur: 3.1, asset: A("s9.png"), bg: "white", motion: "zoomIn",
    telops: [
      { text: "無料相談会で", kind: "normal", delay: 0.3 },
      { text: "お話ししています", kind: "normal", delay: 0.55, size: 56, color: "#2B87E8" },
    ],
  },
  // 10) CTA (34.3–36.86)
  {
    id: 10, dur: 2.5627, asset: A("s9.png"), bg: "white", motion: "zoomIn",
    telops: [
      { text: "気になったら", kind: "normal", delay: 0.2, size: 44, color: "#15294B" },
    ],
    cta: { line1: "プロフィールTOPから", line2: "Check！" },
  },
];

// 本番は新台本版を使用
export const scenes2: Scene[] = scenes2New;

export const TOTAL_FRAMES2 = Math.round(
  scenes2.reduce((s, sc) => s + sc.dur, 0) * FPS
);
