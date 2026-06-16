// 四柱推命 命式計算エンジン（依存ライブラリなし / ESM）
//
// 設計方針:
// - 日柱は最重要（=日主/日干）なのでユリウス通日から厳密に算出する。
//   干支(0..59, 0=甲子) = (JDN + 49) mod 60  （国立天文台の暦計算に整合）
//   検算: 2007-01-01 -> 乙未(31), 2000-01-01 -> 戊午(54)
// - 年柱・月柱は「節入り」で切り替わるため、太陽黄経(apparent longitude)を
//   天文計算(Meeus簡易式, 精度~0.01°)で求めて判定する。
//   立春(黄経315°)を1年の起点、各「節」を月の起点とする。
// - 時柱は出生時刻から。23時以降を翌日扱い(早子時)にするかは option で切替。
//
// 注意: 節入り当日〜前後1日に生まれた人、出生時刻が不明な人は誤差が出やすい。
//       本番運用では「節入り境界の鑑定は手動で再確認」する運用にすること。

export const STEMS = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'];
export const BRANCHES = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];

export const STEM_YOMI = {
  甲: 'きのえ', 乙: 'きのと', 丙: 'ひのえ', 丁: 'ひのと', 戊: 'つちのえ',
  己: 'つちのと', 庚: 'かのえ', 辛: 'かのと', 壬: 'みずのえ', 癸: 'みずのと',
};
export const BRANCH_YOMI = {
  子: 'ね', 丑: 'うし', 寅: 'とら', 卯: 'う', 辰: 'たつ', 巳: 'み',
  午: 'うま', 未: 'ひつじ', 申: 'さる', 酉: 'とり', 戌: 'いぬ', 亥: 'い',
};

// 五行(0=木,1=火,2=土,3=金,4=水)と陰陽(true=陽)
const STEM_ELEMENT = [0, 0, 1, 1, 2, 2, 3, 3, 4, 4]; // 甲乙=木 丙丁=火 戊己=土 庚辛=金 壬癸=水
const STEM_YANG = [true, false, true, false, true, false, true, false, true, false];
const BRANCH_ELEMENT = [4, 2, 0, 0, 2, 1, 1, 2, 3, 3, 2, 4]; // 子水 丑土 寅木 卯木 辰土 巳火 午火 未土 申金 酉金 戌土 亥水
const ELEMENT_NAME = ['木', '火', '土', '金', '水'];

// ---- 暦計算ユーティリティ ----

// グレゴリオ暦 -> 正午のユリウス通日(整数)
export function toJDN(year, month, day) {
  const a = Math.floor((14 - month) / 12);
  const y = year + 4800 - a;
  const m = month + 12 * a - 3;
  return (
    day +
    Math.floor((153 * m + 2) / 5) +
    365 * y +
    Math.floor(y / 4) -
    Math.floor(y / 100) +
    Math.floor(y / 400) -
    32045
  );
}

// 太陽の見かけの黄経(度, 0..360)。jd は UT。Meeus簡易式(精度~0.01°)。
export function solarLongitude(jd) {
  const T = (jd - 2451545.0) / 36525.0;
  const rad = Math.PI / 180;
  const L0 = 280.46646 + 36000.76983 * T + 0.0003032 * T * T;
  const M = 357.52911 + 35999.05029 * T - 0.0001537 * T * T;
  const C =
    (1.914602 - 0.004817 * T - 0.000014 * T * T) * Math.sin(M * rad) +
    (0.019993 - 0.000101 * T) * Math.sin(2 * M * rad) +
    0.000289 * Math.sin(3 * M * rad);
  const trueLong = L0 + C;
  const omega = 125.04 - 1934.136 * T;
  const lambda = trueLong - 0.00569 - 0.00478 * Math.sin(omega * rad);
  return ((lambda % 360) + 360) % 360;
}

// 指定年に太陽黄経が targetDeg(度) になる瞬間の JD(UT) を二分法で求める。
// 立春など年に一度の節気の特定に使う。bracket は概算の月で与える。
function findTermJD(year, targetDeg, approxMonth) {
  // 概算月の前後45日で挟む
  let lo = dateToJD(year, approxMonth, 1, 0, 0, 0);
  let hi = lo + 45;
  const f = (jd) => {
    let d = solarLongitude(jd) - targetDeg;
    // -180..180 に正規化(連続化)
    while (d > 180) d -= 360;
    while (d < -180) d += 360;
    return d;
  };
  let flo = f(lo);
  let fhi = f(hi);
  // 念のため拡張
  let guard = 0;
  while (flo * fhi > 0 && guard < 6) {
    lo -= 15;
    hi += 15;
    flo = f(lo);
    fhi = f(hi);
    guard++;
  }
  for (let i = 0; i < 60; i++) {
    const mid = (lo + hi) / 2;
    const fm = f(mid);
    if (flo * fm <= 0) {
      hi = mid;
      fhi = fm;
    } else {
      lo = mid;
      flo = fm;
    }
  }
  return (lo + hi) / 2;
}

// グレゴリオ暦の日時(UT) -> JD
export function dateToJD(year, month, day, hour = 0, min = 0, sec = 0) {
  const jdn = toJDN(year, month, day);
  return jdn - 0.5 + (hour + min / 60 + sec / 3600) / 24;
}

// ---- 命式の主要算出 ----

function pillarFromIndex(idx) {
  const i = ((idx % 60) + 60) % 60;
  const stem = STEMS[i % 10];
  const branch = BRANCHES[i % 12];
  return {
    index: i,
    stem,
    branch,
    kanshi: stem + branch,
    yomi: `${STEM_YOMI[stem]}${BRANCH_YOMI[branch]}`,
    element: ELEMENT_NAME[STEM_ELEMENT[STEMS.indexOf(stem)]],
  };
}

// 通変星(十神): 日主stem に対する other stem の関係
function tenGod(dayStem, otherStem) {
  const dm = STEMS.indexOf(dayStem);
  const o = STEMS.indexOf(otherStem);
  const dmE = STEM_ELEMENT[dm];
  const oE = STEM_ELEMENT[o];
  const same = STEM_YANG[dm] === STEM_YANG[o];
  const gen = (e) => (e + 1) % 5; // e が生じる五行
  const ctrl = (e) => (e + 2) % 5; // e が剋す五行
  if (oE === dmE) return same ? '比肩' : '劫財';
  if (gen(dmE) === oE) return same ? '食神' : '傷官'; // 我生
  if (ctrl(dmE) === oE) return same ? '偏財' : '正財'; // 我剋
  if (ctrl(oE) === dmE) return same ? '偏官' : '正官'; // 剋我(偏官=七殺)
  if (gen(oE) === dmE) return same ? '偏印' : '正印'; // 生我
  return '';
}

/**
 * 命式を計算する。
 * @param {Object} p
 * @param {number} p.year  出生年(西暦)
 * @param {number} p.month 出生月(1-12)
 * @param {number} p.day   出生日
 * @param {number} [p.hour] 出生時(0-23, 不明なら省略)
 * @param {number} [p.minute] 出生分
 * @param {number} [p.tzOffsetHours=9] 出生地のタイムゾーン(日本=9)
 * @param {boolean} [p.lateZiNextDay=true] 23時以降を翌日扱い(早子時)にするか
 */
export function computeBazi(p) {
  const {
    year,
    month,
    day,
    hour,
    minute = 0,
    tzOffsetHours = 9,
    lateZiNextDay = true,
  } = p;
  const hasTime = typeof hour === 'number';

  // --- 日柱 ---
  // 23時以降を翌日扱いにする場合、日柱の基準日を1日進める。
  let dYear = year, dMonth = month, dDay = day;
  if (hasTime && lateZiNextDay && hour >= 23) {
    const d = new Date(Date.UTC(year, month - 1, day));
    d.setUTCDate(d.getUTCDate() + 1);
    dYear = d.getUTCFullYear();
    dMonth = d.getUTCMonth() + 1;
    dDay = d.getUTCDate();
  }
  const dayIndex = (toJDN(dYear, dMonth, dDay) + 49) % 60;
  const dayPillar = pillarFromIndex(dayIndex);
  const dayStem = dayPillar.stem;

  // --- 出生時刻(UT)と太陽黄経 ---
  const birthJD = dateToJD(year, month, day, hasTime ? hour : 12, minute, 0) - tzOffsetHours / 24;
  const lambda = solarLongitude(birthJD);

  // --- 年柱(立春で切替) ---
  const risshunJD = findTermJD(year, 315, 2); // 立春(黄経315°), 2月頃
  let baziYear = birthJD < risshunJD ? year - 1 : year;
  const yStem = (((baziYear - 4) % 10) + 10) % 10;
  const yBranch = (((baziYear - 4) % 12) + 12) % 12;
  const yearPillar = pillarFromIndex(ganzhiIndex(yStem, yBranch));

  // --- 月柱(節入りで切替, 太陽黄経でバケット) ---
  // 立春(315°)から30°刻みで 寅→卯→… の順。k=0が寅月。
  const k = Math.floor((((lambda - 315) % 360 + 360) % 360) / 30);
  const monthBranchIdx = (k + 2) % 12; // 寅=2
  // 五虎遁: 寅月の天干。年干 -> 寅月干
  const tigerStemIdx = ((yStem % 5) * 2 + 2) % 10;
  const monthStemIdx = (tigerStemIdx + k) % 10;
  const monthPillar = pillarFromIndex(ganzhiIndex(monthStemIdx, monthBranchIdx));

  // --- 時柱 ---
  let hourPillar = null;
  if (hasTime) {
    const totalMin = hour * 60 + minute;
    const hourBranchIdx = Math.floor((totalMin + 60) / 120) % 12; // 23:00-01:00=子
    // 五鼠遁: 日干 -> 子刻の天干
    const ratStemIdx = ((STEMS.indexOf(dayStem) % 5) * 2) % 10;
    const hourStemIdx = (ratStemIdx + hourBranchIdx) % 10;
    hourPillar = pillarFromIndex(ganzhiIndex(hourStemIdx, hourBranchIdx));
  }

  // --- 五行バランス(天干4 + 地支主気4) ---
  const elementCount = { 木: 0, 火: 0, 土: 0, 金: 0, 水: 0 };
  const pillars = [yearPillar, monthPillar, dayPillar, hourPillar].filter(Boolean);
  for (const pl of pillars) {
    elementCount[ELEMENT_NAME[STEM_ELEMENT[STEMS.indexOf(pl.stem)]]]++;
    elementCount[ELEMENT_NAME[BRANCH_ELEMENT[BRANCHES.indexOf(pl.branch)]]]++;
  }

  // --- 通変星(日柱以外の天干) ---
  const tenGods = {
    year: tenGod(dayStem, yearPillar.stem),
    month: tenGod(dayStem, monthPillar.stem),
    hour: hourPillar ? tenGod(dayStem, hourPillar.stem) : null,
  };

  return {
    input: { year, month, day, hour: hasTime ? hour : null, minute, tzOffsetHours },
    pillars: {
      year: yearPillar,
      month: monthPillar,
      day: dayPillar,
      hour: hourPillar,
    },
    dayMaster: {
      stem: dayStem,
      yomi: STEM_YOMI[dayStem],
      element: ELEMENT_NAME[STEM_ELEMENT[STEMS.indexOf(dayStem)]],
      yinYang: STEM_YANG[STEMS.indexOf(dayStem)] ? '陽' : '陰',
    },
    tenGods,
    elementCount,
    solarLongitude: Math.round(lambda * 100) / 100,
    notes: hasTime ? [] : ['出生時刻が未入力のため時柱は省略（鑑定精度がやや下がります）'],
  };
}

// 天干index, 地支index から 0..59 の干支index を求める(中国剰余)
function ganzhiIndex(stemIdx, branchIdx) {
  // 干支iは i%10=stem, i%12=branch を満たす(0<=i<60)
  for (let i = 0; i < 60; i++) {
    if (i % 10 === stemIdx && i % 12 === branchIdx) return i;
  }
  return 0;
}
