import test from 'node:test';
import assert from 'node:assert/strict';

import { createSafeSlug, toBulletList, pickFirstValue } from '../scripts/utils.js';
import { normalizeArray, detectIndustry } from '../scripts/create-site-spec.js';
import { buildDemoSiteHtml, buildDemoSiteFiles } from '../scripts/build-demo-site.js';
import { buildInputFromLead } from '../scripts/industry-templates.js';
import { auditHtml } from '../scripts/audit-site.js';

test('createSafeSlug: ascii, fallback, collapse', () => {
  assert.equal(createSafeSlug('Sample Koumuten'), 'sample-koumuten');
  assert.equal(createSafeSlug('  --A__B--  '), 'a-b');
  assert.equal(createSafeSlug('', 'site'), 'site');
  // Non-ascii (Japanese) collapses to fallback rather than empty.
  assert.equal(createSafeSlug('みどり', 'lead'), 'lead');
});

test('toBulletList: arrays, strings, empty', () => {
  assert.equal(toBulletList(['a', 'b']), '- a\n- b');
  assert.equal(toBulletList('x'), '- x');
  assert.equal(toBulletList([]), '- 記載なし');
});

test('pickFirstValue: first non-empty, array join, default', () => {
  assert.equal(pickFirstValue({ a: '', b: 'hit' }, ['a', 'b']), 'hit');
  assert.equal(pickFirstValue({ a: ['x', 'y'] }, ['a']), 'x / y');
  assert.equal(pickFirstValue({}, ['a'], 'def'), 'def');
});

test('normalizeArray: array/string/empty', () => {
  assert.deepEqual(normalizeArray([' a ', '', 'b']), ['a', 'b']);
  assert.deepEqual(normalizeArray('x'), ['x']);
  assert.deepEqual(normalizeArray(null), []);
});

test('detectIndustry: keyword routing', () => {
  assert.equal(detectIndustry({ companyName: 'みどり霊園', siteConcept: ['永代供養'] }), 'memorial');
  assert.equal(detectIndustry({ companyName: 'サンプル工務店', recommendedPages: ['施工事例'] }), 'construction');
  assert.equal(detectIndustry({ industry: '司法書士' }), 'professional');
  assert.equal(detectIndustry({ companyName: '山田商店' }), 'general');
});

test('buildInputFromLead: fills required fields and detects industry', () => {
  const input = buildInputFromLead({ companyName: 'あおぞら司法書士事務所', industry: '司法書士' });
  const required = [
    'companyName', 'website', 'companyOverview', 'currentSiteIssues', 'targetCustomers',
    'siteConcept', 'recommendedPages', 'firstViewIdeas', 'ctaIdeas', 'designTone', 'buildInstruction'
  ];
  for (const f of required) {
    const v = input[f];
    assert.ok(Array.isArray(v) ? v.length > 0 : String(v).trim() !== '', `missing ${f}`);
  }
  // professional template should surface a 相談予約-style page.
  assert.ok(input.recommendedPages.some((p) => /相談予約/.test(p)));
});

test('buildInputFromLead: requires companyName; honors pipe overrides', () => {
  assert.throws(() => buildInputFromLead({ website: 'x' }), /companyName/);
  const input = buildInputFromLead({ companyName: 'X', ctaIdeas: 'A|B|C' });
  assert.deepEqual(input.ctaIdeas, ['A', 'B', 'C']);
});

test('buildDemoSiteHtml: renders company name and core sections', () => {
  const html = buildDemoSiteHtml({
    companyName: 'テスト工務店',
    recommendedPages: ['トップページ', '施工事例'],
    ctaIdeas: ['無料相談']
  });
  assert.match(html, /<!doctype html>/);
  assert.match(html, /テスト工務店/);
  assert.match(html, /よくあるご質問/); // FAQ section present
  assert.match(html, /お客様の声/); // testimonials present
  assert.match(html, /og:title/); // OGP present
  // balanced sections
  const open = (html.match(/<section/g) || []).length;
  const close = (html.match(/<\/section>/g) || []).length;
  assert.equal(open, close);
});

test('buildDemoSiteHtml: escapes HTML to prevent injection', () => {
  const html = buildDemoSiteHtml({ companyName: '<script>alert(1)</script>会社' });
  assert.ok(!html.includes('<script>alert(1)</script>'), 'raw script must not appear');
  assert.match(html, /&lt;script&gt;/);
});

test('buildDemoSiteFiles: emits index.html and _headers', () => {
  const files = buildDemoSiteFiles({ companyName: 'A' });
  const paths = files.map((f) => f.path).sort();
  assert.deepEqual(paths, ['_headers', 'index.html']);
});

test('auditHtml: flags legacy site, passes clean site', () => {
  const legacy = '<html><head></head><body><table><tr><td></td></tr></table><table></table><font>x</font></body></html>';
  const bad = auditHtml(legacy);
  assert.ok(bad.issues.some((i) => i.id === 'viewport'));
  assert.ok(bad.issues.some((i) => i.id === 'layout-table'));
  assert.ok(bad.score < 50);

  const clean = buildDemoSiteHtml({ companyName: 'A' });
  const good = auditHtml(clean);
  assert.equal(good.score, 100);
  assert.equal(good.issues.length, 0);
});
