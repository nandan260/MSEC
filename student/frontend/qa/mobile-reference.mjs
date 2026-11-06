// Real-app visual and navigation checks; backend and Vite must already be running.
// QA_BASE=http://localhost:3000 CHROMIUM_PATH=/path/to/chromium node qa/mobile-reference.mjs
import assert from 'node:assert/strict';
import { mkdirSync } from 'node:fs';
import { chromium } from 'playwright';

const base = process.env.QA_BASE || 'http://localhost:3000';
const output = new URL('./out/mobile-reference/', import.meta.url);
mkdirSync(output, { recursive: true });
const browser = await chromium.launch({
  headless: true,
  ...(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {}),
});
const errors = [];
const tabs = ['Home', 'Attendance', 'Ask AI', 'Academics', 'Timetable', 'More'];

async function ready(page, label) {
  if (label === 'Home') await page.getByRole('region', { name: /Student summary for/ }).waitFor();
  if (label === 'Attendance') await page.getByText('By subject', { exact: true }).waitFor();
  if (label === 'Academics') await page.locator('.grade-entry').first().waitFor();
  if (label === 'Timetable') await page.locator('.timetable__timeline').waitFor();
  if (label === 'More') await page.getByRole('heading', { name: 'Study', exact: true }).waitFor();
  if (label === 'Ask AI') await page.getByRole('textbox', { name: 'Message Ask AI' }).waitFor();
  await page.evaluate(() => document.fonts.ready);
}

async function fits(page, label, width) {
  const geometry = await page.evaluate(() => ({ width: innerWidth, scroll: document.documentElement.scrollWidth }));
  assert.ok(geometry.scroll <= geometry.width, `${label} overflows at ${width}: ${JSON.stringify(geometry)}`);
  for (const button of await page.getByRole('navigation', { name: 'Primary' }).getByRole('button').all()) {
    const box = await button.boundingBox();
    assert.ok(box && box.x >= 0 && box.x + box.width <= width, `${label}: tab outside viewport`);
  }
}

try {
  for (const width of [390, 320, 1440]) {
    const context = await browser.newContext({ viewport: { width, height: 844 }, reducedMotion: 'reduce' });
    await context.addInitScript(() => sessionStorage.setItem('msec-splash-seen', '1'));
    const page = await context.newPage();
    page.on('pageerror', (e) => errors.push(e.message));
    await page.goto(base);
    for (const label of tabs) {
      await page.getByRole('navigation', { name: 'Primary' }).getByRole('button', { name: label, exact: true }).click();
      await ready(page, label);
      await fits(page, label, width);
      await page.screenshot({ path: new URL(`${width}-${label.replaceAll(' ', '-')}.png`, output).pathname, fullPage: true, animations: 'disabled' });
      if (label === 'Ask AI') {
        const composer = await page.getByRole('textbox', { name: 'Message Ask AI' }).boundingBox();
        const nav = await page.getByRole('navigation', { name: 'Primary' }).boundingBox();
        assert.ok(composer.y + composer.height < nav.y, 'AI composer overlaps tabs');
      }
    }
    // Save a non-default day and then the weekly view, ensuring offline restore
    // uses the exact saved query rather than silently choosing today's schedule.
    const nav = page.getByRole('navigation', { name: 'Primary' });
    await nav.getByRole('button', { name: 'Timetable', exact: true }).click();
    await ready(page, 'Timetable');
    await page.getByRole('button', { name: 'Thu', exact: true }).click();
    await page.locator('.timetable__timeline').waitFor();
    await page.getByRole('button', { name: 'Week view', exact: true }).click();
    await page.getByRole('table').waitFor();
    await page.waitForFunction(() => Object.keys(localStorage).some((key) => key.endsWith(':/timetable?view=weekly')));
    await context.setOffline(true);
    await page.getByRole('heading', { name: "You're offline" }).waitFor();
    await page.screenshot({ path: new URL(`${width}-Offline.png`, output).pathname, animations: 'disabled' });
    await page.getByRole('button', { name: 'Show saved records' }).click();
    try { await page.getByRole('table').waitFor({ timeout: 10000 }); }
    catch (error) { throw new Error(`${width}px offline restore: ${await page.locator('main').innerText()}`, { cause: error }); }
    await context.setOffline(false);
    await page.evaluate(() => window.__msecNav.navigate('missing-reference-page'));
    await page.getByRole('heading', { name: 'Page not found' }).waitFor();
    await page.screenshot({ path: new URL(`${width}-404.png`, output).pathname, animations: 'disabled' });
    await page.getByRole('button', { name: 'Ask AI for help' }).click();
    await page.getByRole('textbox', { name: 'Message Ask AI' }).waitFor();
    await page.evaluate(() => window.__msecNav.navigate('missing-again'));
    await page.getByRole('button', { name: 'Go to Home' }).click();
    await ready(page, 'Home');
    console.log(`${width}px: six tabs, offline weekly restore, 404 recovery, no overflow`);
    await context.close();
  }
  assert.deepEqual(errors, [], 'Browser runtime errors');
} finally { await browser.close(); }
