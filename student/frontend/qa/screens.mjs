// 390px QA: node qa/screens.mjs [id ...]
// Expects `vite preview` on :4174 and Flask on :5000 (starts nothing itself).
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { SCREENS } from '../src/nav.js';

// ---- Configuration (edit here) ----
const BASE = process.env.QA_BASE || 'http://localhost:4174';
const WIDTH = 390;
const HEIGHT = 844;
const MIN_FONT_PX = 12;
const SCREEN_TIMEOUT_MS = 8000; // per wait
const SCREEN_HARD_CAP_MS = 15000; // whole screen
// Descendants of these containers are ignored by the overflow check.
// The container itself must still fit in WIDTH.
const ALLOW_SCROLL_X = ['.scroll-x'];
// Selector that proves a special id rendered (ids not listed here must show
// the TopBar title equal to SCREENS[id].label).
const READY = { auth: '[data-qa="auth-screen"]' };
const TITLE_SELECTOR = '.topbar__title';
// ------------------------------------

const OUT = fileURLToPath(new URL('./out/', import.meta.url));
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
  // Descendants only: the container itself is still measured.
  const inAllowed = (el) => !!el.parentElement && allow.some((a) => el.parentElement.closest(a));
  // Not rendered to the user: display:none, visibility:hidden, opacity:0 on self or ancestor.
  const hiddenChain = (el) => {
    for (let e = el; e; e = e.parentElement) {
      const cs = getComputedStyle(e);
      if (cs.display === 'none' || cs.visibility === 'hidden' || parseFloat(cs.opacity) === 0) return true;
    }
    return false;
  };
  const fixedChain = (el) => {
    for (let e = el; e; e = e.parentElement) if (getComputedStyle(e).position === 'fixed') return true;
    return false;
  };
  const root = document.documentElement;
  const out = { scrollWidth: root.scrollWidth, widest: null, containerOver: null, small: [] };
  let best = null;
  for (const el of document.body.querySelectorAll('*')) {
    if (inAllowed(el)) continue;
    const r = el.getBoundingClientRect();
    if (r.width === 0 && r.height === 0) continue;
    if (r.right <= width + 0.5) continue;
    if (fixedChain(el) || hiddenChain(el)) continue;
    if (allow.some((a) => el.matches(a))) out.containerOver = `${sel(el)} (right=${Math.round(r.right)})`;
    if (!best || r.right > best.right) best = { el, right: r.right };
  }
  out.widest = best ? `${sel(best.el)} (right=${Math.round(best.right)})` : null;

  const small = (el, fs, what) => { if (fs < minFont) out.small.push(`${sel(el)} ${what}${fs}px`); };
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  let n;
  while ((n = walker.nextNode())) {
    if (!n.nodeValue.trim()) continue;
    const p = n.parentElement;
    if (!p || ['SCRIPT', 'STYLE', 'NOSCRIPT', 'TEXTAREA', 'OPTION'].includes(p.tagName)) continue;
    const range = document.createRange();
    range.selectNodeContents(n);
    const r = range.getBoundingClientRect();
    if (r.width === 0 || r.height === 0 || hiddenChain(p)) continue;
    small(p, parseFloat(getComputedStyle(p).fontSize), '');
  }
  for (const el of document.querySelectorAll('input, textarea, select')) {
    if (el.type === 'hidden') continue;
    const r = el.getBoundingClientRect();
    if (r.width === 0 || r.height === 0 || hiddenChain(el)) continue;
    small(el, parseFloat(getComputedStyle(el).fontSize), 'control ');
    if (el.getAttribute('placeholder')) {
      small(el, parseFloat(getComputedStyle(el, '::placeholder').fontSize), 'placeholder ');
    }
  }
  return out;
}

async function runScreen(page, id, state) {
  const problems = [];
  if (id !== 'auth' && !SCREENS[id]) throw new Error(`unknown screen id "${id}"`);
  await page.goto(id === 'auth' ? `${BASE}/?screen=auth` : BASE, { waitUntil: 'load', timeout: SCREEN_TIMEOUT_MS });
  if (id !== 'auth') {
    await page.waitForFunction(() => !!window.__msecNav, null, { timeout: SCREEN_TIMEOUT_MS });
    // Let the initial dashboard load finish so its errors are not blamed on this screen.
    await page.waitForLoadState('networkidle', { timeout: SCREEN_TIMEOUT_MS }).catch(() => {});
    state.errors = [];
    await page.evaluate((i) => window.__msecNav.navigate(i), id);
  }
  await page.waitForLoadState('networkidle', { timeout: SCREEN_TIMEOUT_MS }).catch(() => {});
  await page.waitForTimeout(300);
  // Safety net: drop any splash overlay still in the DOM.
  await page.evaluate(() => document.getElementById('msec-sp-root')?.remove());

  // Render-ready assertion.
  let ready = true;
  if (READY[id]) {
    ready = await page.waitForSelector(READY[id], { state: 'visible', timeout: 3000 }).then(() => true, () => false);
    if (!ready) problems.push(`${id} screen not rendered: ${READY[id]} not found`);
  } else {
    const want = SCREENS[id].label;
    ready = await page
      .waitForFunction(([s, w]) => document.querySelector(s)?.textContent.trim() === w, [TITLE_SELECTOR, want], { timeout: 3000 })
      .then(() => true, () => false);
    if (!ready) {
      const got = await page.evaluate((s) => document.querySelector(s)?.textContent.trim() ?? null, TITLE_SELECTOR);
      problems.push(`${id} screen not rendered: TopBar title is ${JSON.stringify(got)}, expected ${JSON.stringify(want)}`);
    }
  }

  const m = await page.evaluate(measure, { width: WIDTH, minFont: MIN_FONT_PX, allow: ALLOW_SCROLL_X });
  await page.screenshot({ path: `${OUT}${id}.png`, fullPage: true });
  if (m.scrollWidth > WIDTH) {
    problems.push(m.widest
      ? `overflow: scrollWidth=${m.scrollWidth} > ${WIDTH}; widest: ${m.widest}`
      : `unexplained overflow: scrollWidth=${m.scrollWidth} > ${WIDTH} but no visible element extends past ${WIDTH}`);
  }
  if (m.containerOver) problems.push(`scroll container wider than viewport: ${m.containerOver}`);
  if (m.small.length) {
    problems.push(`font <${MIN_FONT_PX}px: ${m.small.length} item(s); first 5: ${m.small.slice(0, 5).join(' | ')}`);
  }
  let errs = [...new Set(state.errors)];
  if (errs.some((e) => e.startsWith('HTTP '))) errs = errs.filter((e) => !e.includes('Failed to load resource'));
  if (errs.length) problems.push(`errors (${errs.length}): ${errs.slice(0, 4).join(' | ')}`);
  return problems;
}

const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM || '/home/vinay/.local/bin/chromium',
  args: ['--no-sandbox'],
});
let failedCount = 0;
let total = 0;
try {
  const ctx = await browser.newContext({ viewport: { width: WIDTH, height: HEIGHT }, deviceScaleFactor: 1 });
  // Splash script skips itself when this sessionStorage flag is set.
  await ctx.addInitScript(() => {
    try { sessionStorage.setItem('msec-splash-seen', '1'); } catch { /* ignore */ }
  });
  const page = await ctx.newPage();
  const state = { errors: [] };
  page.on('console', (m) => { if (m.type() === 'error') state.errors.push('console.error: ' + m.text().slice(0, 200)); });
  page.on('pageerror', (e) => state.errors.push('pageerror: ' + String(e.message || e).slice(0, 200)));
  page.on('response', (r) => {
    const u = r.url();
    if (r.status() >= 400 && /\/(api|uploads)(\/|\?|$)/.test(new URL(u).pathname)) {
      state.errors.push(`HTTP ${r.status()} ${u}`);
    }
  });

  for (const id of ids) {
    state.errors = [];
    let problems;
    let timer;
    try {
      problems = await Promise.race([
        runScreen(page, id, state),
        new Promise((_, rej) => { timer = setTimeout(() => rej(new Error(`hard cap ${SCREEN_HARD_CAP_MS}ms exceeded`)), SCREEN_HARD_CAP_MS); }),
      ]);
    } catch (e) {
      problems = ['script: ' + String(e.message || e).split('\n')[0]];
    } finally {
      clearTimeout(timer);
    }
    total++;
    if (problems.length) failedCount++;
    console.log(`${problems.length ? 'FAIL' : 'PASS'} ${id}`);
    for (const p of problems) console.log(`     - ${p}`);
  }
} finally {
  await browser.close();
}
console.log(`\n${total - failedCount} pass / ${failedCount} fail of ${total}`);
process.exit(failedCount ? 1 : 0);
