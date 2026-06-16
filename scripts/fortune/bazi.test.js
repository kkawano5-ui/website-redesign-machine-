// 四柱推命エンジンの検算（APIキー不要 / `npm run fortune:test`）
import { computeBazi, toJDN } from './bazi.js';

let pass = 0;
let fail = 0;
function assert(label, actual, expected) {
  const ok = actual === expected;
  if (ok) pass++;
  else fail++;
  console.log(`${ok ? '✅' : '❌'} ${label}: ${actual}${ok ? '' : ` (expected ${expected})`}`);
}

// --- 日柱の検算（国立天文台ベースの (JDN+49)%60 が正しいか） ---
assert('JDN 2007-01-01', toJDN(2007, 1, 1), 2454102);
assert('JDN 2000-01-01', toJDN(2000, 1, 1), 2451545);
assert('日柱 2007-01-01', computeBazi({ year: 2007, month: 1, day: 1 }).pillars.day.kanshi, '乙未');
assert('日柱 2000-01-01', computeBazi({ year: 2000, month: 1, day: 1 }).pillars.day.kanshi, '戊午');

// --- 年柱（立春境界） ---
// 1984年は甲子年。立春(2/4頃)以降の生まれは甲子年。
assert('年柱 1984-06-15', computeBazi({ year: 1984, month: 6, day: 15 }).pillars.year.kanshi, '甲子');
// 1984-01-15 は立春前なので前年(癸亥)扱い
assert('年柱 1984-01-15(立春前)', computeBazi({ year: 1984, month: 1, day: 15 }).pillars.year.kanshi, '癸亥');

// --- 時柱（五鼠遁） ---
// 日干が甲の日の子刻(0時台)は甲子刻
const r = computeBazi({ year: 1984, month: 6, day: 15, hour: 0, minute: 30 });
console.log('  参考: 1984-06-15 00:30 命式 =',
  r.pillars.year.kanshi, r.pillars.month.kanshi, r.pillars.day.kanshi, r.pillars.hour.kanshi,
  '/ 日主', r.dayMaster.stem, r.dayMaster.element, r.dayMaster.yinYang,
  '/ 五行', JSON.stringify(r.elementCount));

console.log(`\n${fail === 0 ? '🎉 全テスト通過' : '⚠️ 失敗あり'}  pass=${pass} fail=${fail}`);
process.exit(fail === 0 ? 0 : 1);
