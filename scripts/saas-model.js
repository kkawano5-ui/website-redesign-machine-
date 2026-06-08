/**
 * SaaS / asset-route model — the "build a sellable asset" path to ¥100M
 * net worth, as opposed to the cash-accumulation path in revenue-model.js.
 *
 *   npm run saas
 *   npm run saas -- --price 9800 --signups 15 --growth 0.12 --multiple 4
 *
 * Why this exists: for a founder with expertise + capital + time, the
 * fastest route to ¥100M NET WORTH is usually not piling up cash but
 * building recurring revenue that is sellable at a multiple. Net worth
 * here = cumulative cash profit + equity value (ARR x multiple). This
 * makes the "asset" math explicit and shows when net worth crosses ¥100M.
 *
 * It is a planning tool, not a promise: the numbers move only when real
 * users sign up and pay. Use it to pressure-test which assumptions a
 * 3-year ¥100M goal actually requires.
 */

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i].startsWith('--')) {
      const key = argv[i].slice(2);
      const next = argv[i + 1];
      args[key] = next !== undefined && !next.startsWith('--') ? Number(next) : true;
      if (typeof args[key] === 'number') i += 1;
    }
  }
  return args;
}

function yen(n) {
  return `¥${Math.round(n).toLocaleString('ja-JP')}`;
}

function main() {
  const a = parseArgs(process.argv.slice(2));

  const price = a.price ?? 9800; // 月額/顧客（SaaS サブスク）
  const startSignups = a.signups ?? 12; // 1ヶ月目の新規獲得数
  const growth = a.growth ?? 0.12; // 新規獲得の月次成長率（複利）
  const churnPerMonth = a.churn ?? 0.04; // 月次解約率
  const grossMargin = a.margin ?? 0.85; // SaaS 粗利率
  const monthlyFixed = a.fixed ?? 250000; // 固定費（月・ツール/外注/広告ベース）
  const multiple = a.multiple ?? 4; // 売却時の評価倍率（ARR x N）
  const target = a.target ?? 100000000; // 目標純資産 ¥1億
  const months = a.months ?? 36; // 3年

  let active = 0;
  let signups = startSignups;
  let cumulativeCash = 0;
  let reachedMonth = null;
  const rows = [];

  for (let m = 1; m <= months; m += 1) {
    active = active * (1 - churnPerMonth) + signups;
    const mrr = active * price;
    const arr = mrr * 12;
    const cashNet = mrr * grossMargin - monthlyFixed;
    cumulativeCash += cashNet;
    const equityValue = arr * multiple;
    const netWorth = cumulativeCash + equityValue;
    if (reachedMonth === null && netWorth >= target) reachedMonth = m;
    if (m % 6 === 0 || m === 1 || m === months) {
      rows.push({ m, active, mrr, arr, cumulativeCash, equityValue, netWorth });
    }
    signups *= 1 + growth;
  }

  console.log('=== Asset-Route (SaaS) Model — 純資産 ¥1億への資産ルート ===\n');
  console.log('前提:');
  console.log(`  月額単価            ${yen(price)} / 顧客`);
  console.log(`  初月の新規獲得      ${startSignups} 件 → 月次 ${(growth * 100).toFixed(0)}% 成長`);
  console.log(`  月次解約率          ${(churnPerMonth * 100).toFixed(1)} %`);
  console.log(`  粗利率 / 固定費     ${(grossMargin * 100).toFixed(0)} % / ${yen(monthlyFixed)}/月`);
  console.log(`  評価倍率            ARR × ${multiple}`);
  console.log(`  目標純資産          ${yen(target)}（${months}ヶ月以内）\n`);

  console.log('Month | 顧客数 |       MRR |       ARR |   累計現金 |     事業価値 |     純資産');
  console.log('------+--------+-----------+-----------+-----------+-------------+-----------');
  for (const r of rows) {
    console.log(
      `${String(r.m).padStart(5)} | ${r.active.toFixed(0).padStart(6)} | ${yen(r.mrr).padStart(9)} | ${yen(r.arr).padStart(9)} | ${yen(r.cumulativeCash).padStart(9)} | ${yen(r.equityValue).padStart(11)} | ${yen(r.netWorth).padStart(9)}`
    );
  }

  console.log('');
  if (reachedMonth) {
    const years = (reachedMonth / 12).toFixed(1);
    console.log(`✅ 純資産 ${yen(target)} 到達: ${reachedMonth} ヶ月目（約 ${years} 年）`);
    console.log('   ※到達の大半は「事業価値（ARR×倍率）」。現金だけで1億ではなく、売れる資産を作る前提です。');
  } else {
    console.log(`⚠️  ${months} ヶ月では純資産が目標未達。`);
    console.log('   price / signups / growth / churn / multiple のいずれかを改善してください。例:');
    console.log('   npm run saas -- --price 14800 --signups 20 --growth 0.13 --churn 0.03 --multiple 5');
  }
  console.log('\n注意: これは計画ツールです。実際の純資産は、実在のユーザーが登録し課金されて初めて動きます。');
}

main();
