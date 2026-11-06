// 390px QA: node qa/screens.mjs [id ...]
// Expects `vite preview` on :4174 and Flask on :5000 (starts nothing itself).
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
import { SCREENS } from '../src/nav.js';

// ---- Configuration (edit here) ----
const BASE = process.env.QA_BASE || 'http://localhost:4174';
const WIDTH = 390;
const HEIGHT = 844;
const MIN_FONT_PX = 12;
const SCREEN_TIMEOUT_MS = 8000;
// Elements inside these selectors are ignored by the overflow check.
const ALLOW_SCROLL_X = ['.scroll-x'];
// ------------------------------------

const OUT = new URL('./out/', import.meta.url).pathname;
mkdirSync(OUT, { recursive: true });

const ids = process.argv.slice(2).length ? process.argv.slice(2) : Object.keys(SCREENS);

// Runs in the page. Returns overflow + small-font findings.
function measure({ width, minFont, allow }) {
  const sel = (el) => {
    let s = el.tagName.toLowerCase();
    if (el.id) s += '#' + el.id;
    const cls = typeof el.className === 'string' ? el.className.trim().split(/\s+/).filter(Boolean) : [];
    if (cls.length) s += '.' + cls.slice(0, 3).join('.');
    const t = (el.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 30);
    return t ? `${s} "${t}"` : s;
  };
  const inAllowed = (el) => allow.some((a) => el.closest(a));
  const root = document.documentElement;
  const out = { scrollWidth: root.scrollWidth, widest: null, small: [] };
  if (root.scrollWidth > width) {
    let best = null;
    for (const el of document.body.querySelectorAll('*')) {
      if (inAllowed(el)) continue;
      const r = el.getBoundingClientRect();
      if (r.width === 0 && r.height === 0) continue;
      if (r.right > width && (!best || r.right > best.right)) best = { el, right: r.right };
    }
    out.widest = best ? `${sel(best.el)} (right=${Math.round(best.right)})` : null;
    out.onlyAllowed = !best; // overflow comes only from allowed elements
  }
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  let n;
  while ((n = walker.nextNode())) {
    if (!n.nodeValue.trim()) continue;
    const p = n.parentElement;
    if (!p || p.closest('[aria-hidden="true"]') || ['SCRIPT', 'STYLE', 'NOSCRIPT'].includes(p.tagName)) continue;
    const range = document.createRange();
    range.selectNodeContents(n);
    const r = range.getBoundingClientRect();
    if (r.width === 0 || r.height === 0) continue;
    let hidden = false;
    for (let e = p; e; e = e.parentElement) {
      const cs = getComputedStyle(e);
      if (cs.display === 'none' || cs.visibility === 'hidden') { hidden = true; break; }
    }
    if (hidden) continue;
    const fs = parseFloat(getComputedStyle(p).fontSize);
    if (fs < minFont) out.small.push(`${sel(p)} ${fs}px`);
  }
  return out;
}

const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM || '/home/vinay/.local/bin/chromium',
  args: ['--no-sandbox'],
});
const ctx = await browser.newContext({ viewport: { width: WIDTH, height: HEIGHT }, deviceScaleFactor: 1 });
// Splash script skips itself when this sessionStorage flag is set.
await ctx.addInitScript(() => {
  try { sessionStorage.setItem('msec-splash-seen', '1'); } catch { /* ignore */ }
});
const page = await ctx.newPage();

let errors = [];
page.on('console', (m) => { if (m.type() === 'error') errors.push('console.error: ' + m.text().slice(0, 200)); });
page.on('pageerror', (e) => errors.push('pageerror: ' + String(e.message || e).slice(0, 200)));

const results = [];
for (const id of ids) {
  errors = [];
  const problems = [];
  try {
    if (id !== 'auth' && !SCREENS[id]) throw new Error(`unknown screen id "${id}"`);
    await page.goto(id === 'auth' ? `${BASE}/?screen=auth` : BASE, { waitUntil: 'load', timeout: SCREEN_TIMEOUT_MS });
    if (id !== 'auth') {
      await page.waitForFunction(() => !!window.__msecNav, null, { timeout: SCREEN_TIMEOUT_MS });
      await page.evaluate((i) => window.__msecNav.navigate(i), id);
    }
    await page.waitForLoadState('networkidle', { timeout: SCREEN_TIMEOUT_MS }).catch(() => {});
    await page.waitForTimeout(300);
    // Safety net: drop any splash overlay still in the DOM.
    await page.evaluate(() => document.getElementById('msec-sp-root')?.remove());
    const m = await page.evaluate(measure, { width: WIDTH, minFont: MIN_FONT_PX, allow: ALLOW_SCROLL_X });
    await page.screenshot({ path: `${OUT}${id}.png`, fullPage: true });
    if (m.scrollWidth > WIDTH && !m.onlyAllowed) {
      problems.push(`overflow: scrollWidth=${m.scrollWidth} > ${WIDTH}; widest: ${m.widest}`);
    }
    if (m.small.length) {
      problems.push(`font <${MIN_FONT_PX}px: ${m.small.length} node(s); first 5: ${m.small.slice(0, 5).join(' | ')}`);
    }
    if (errors.length) problems.push(`errors (${errors.length}): ${[...new Set(errors)].slice(0, 3).join(' | ')}`);
  } catch (e) {
    problems.push('script: ' + String(e.message || e).split('\n')[0]);
  }
  results.push({ id, problems });
  console.log(`${problems.length ? 'FAIL' : 'PASS'} ${id}`);
  for (const p of problems) console.log(`     - ${p}`);
}
await browser.close();
const failed = results.filter((r) => r.problems.length);
console.log(`\n${results.length - failed.length} pass / ${failed.length} fail of ${results.length}`);
process.exit(failed.length ? 1 : 0);
