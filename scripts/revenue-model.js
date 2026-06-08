/**
 * Revenue model — the literal path from this asset to ¥100M+ net worth.
 *
 *   npm run model
 *   npm run model -- --price 350000 --retainer 15000 --close 0.08 --demos 40
 *
 * The demo generator drives near-zero marginal cost per demo, so the only
 * variables that matter are: how many demos you send, your close rate, and
 * the price/retainer per client. This script makes that math explicit and
 * shows how long it takes to reach a target net worth.
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

  // Defaults are deliberately conservative for a local-SMB redesign service.
  const buildPrice = a.price ?? 300000; // 初期制作（1サイト）
  const retainer = a.retainer ?? 12000; // 月額保守/更新
  const demosPerMonth = a.demos ?? 30; // 月あたり送るデモ数（量産が効く部分）
  const closeRate = a.close ?? 0.06; // 成約率（デモ→契約）
  const cogsRate = a.cogs ?? 0.15; // 1案件あたり原価率（外注/ツール等）
  const monthlyFixed = a.fixed ?? 80000; // 固定費（月）
  const churnPerYear = a.churn ?? 0.2; // 保守の年間解約率
  const target = a.target ?? 100000000; // 目標純資産 ¥1億
  const months = a.months ?? 60; // シミュレーション期間

  const winsPerMonth = demosPerMonth * closeRate;

  let activeRetainers = 0;
  let cumulativeNet = 0;
  let reachedMonth = null;
  const monthlyChurn = 1 - (1 - churnPerYear) ** (1 / 12);
  const rows = [];

  for (let m = 1; m <= months; m += 1) {
    activeRetainers = activeRetainers * (1 - monthlyChurn) + winsPerMonth;
    const buildRevenue = winsPerMonth * buildPrice;
    const retainerRevenue = activeRetainers * retainer;
    const revenue = buildRevenue + retainerRevenue;
    const net = revenue * (1 - cogsRate) - monthlyFixed;
    cumulativeNet += net;
    if (reachedMonth === null && cumulativeNet >= target) reachedMonth = m;
    if (m % 12 === 0 || m === 1) {
      rows.push({ m, revenue, net, cumulativeNet, activeRetainers });
    }
  }

  console.log('=== Website Redesign Machine — Revenue Model ===\n');
  console.log('前提:');
  console.log(`  初期制作単価        ${yen(buildPrice)}`);
  console.log(`  月額保守            ${yen(retainer)}`);
  console.log(`  月間デモ送付数      ${demosPerMonth} 件`);
  console.log(`  成約率              ${(closeRate * 100).toFixed(1)} %  -> 新規 ${winsPerMonth.toFixed(1)} 件/月`);
  console.log(`  原価率 / 固定費     ${(cogsRate * 100).toFixed(0)} % / ${yen(monthlyFixed)}/月`);
  console.log(`  保守 年間解約率     ${(churnPerYear * 100).toFixed(0)} %`);
  console.log(`  目標純資産          ${yen(target)}\n`);

  console.log('Month |     売上/月 |     利益/月 |   累計利益 | 保守社数');
  console.log('------+------------+------------+-----------+---------');
  for (const r of rows) {
    console.log(
      `${String(r.m).padStart(5)} | ${yen(r.revenue).padStart(10)} | ${yen(r.net).padStart(10)} | ${yen(r.cumulativeNet).padStart(9)} | ${r.activeRetainers.toFixed(0).padStart(7)}`
    );
  }

  console.log('');
  if (reachedMonth) {
    const years = (reachedMonth / 12).toFixed(1);
    console.log(`✅ 目標 ${yen(target)} 到達: ${reachedMonth} ヶ月目（約 ${years} 年）`);
  } else {
    console.log(`⚠️  ${months} ヶ月では目標未達（累計利益 ${yen(cumulativeNet)}）。`);
    console.log('   price / retainer / close / demos のいずれかを引き上げてください。例:');
    console.log('   npm run model -- --price 400000 --close 0.08 --demos 50 --retainer 18000');
  }
  console.log('\nヒント: 「demos」はこのマシンの量産機能で増やせる唯一ほぼ無料の変数です。');
}

main();
