import { chromium } from 'playwright';
import assert from 'node:assert/strict';

const browser = await chromium.launch({
  headless: true,
  executablePath: process.env.CHROME_PATH || '/usr/bin/google-chrome-stable',
  args: ['--no-sandbox']
});
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  await page.goto(process.env.BASE_URL || 'http://localhost:4173');
  await page.getByRole('heading', { name: 'Teaching overview', exact: true }).waitFor();
  const art = page.locator('.desk-hero img');
  await art.evaluate(img => img.decode());
  assert(await art.evaluate(img => img.naturalWidth > 0), 'Blender artwork loads');
  assert.equal(await art.getAttribute('alt'), '', 'Decorative artwork does not duplicate screen-reader content');
  assert.equal(await page.locator('.week-column').count(), 7);
  await page.getByRole('region', { name: 'Teaching overview' }).getByRole('link', { name: 'View timetable', exact: true }).click();
  await page.getByRole('heading', { name: 'Weekly timetable', exact: true }).waitFor();
  await page.getByRole('link', { name: 'Overview', exact: true }).click();
  await page.getByRole('button', { name: 'Collapse sidebar', exact: true }).click();
  assert(await page.locator('#app').evaluate(el => el.classList.contains('sidebar-collapsed')));
  assert.equal(await page.getByRole('link', { name: 'My classes', exact: true }).count(), 1);
  await page.getByRole('button', { name: 'Expand sidebar', exact: true }).click();
  assert(!(await page.locator('#app').evaluate(el => el.classList.contains('sidebar-collapsed'))));
  console.log('PASS: Blender artwork, live shortcut, seven chart columns and accessible sidebar controls');

  for (const [width, height] of [[1440, 1000], [1366, 768], [1024, 768], [768, 1024], [390, 844], [320, 740]]) {
    await page.setViewportSize({ width, height });
    await page.locator('main').evaluate(el => { el.scrollTop = 0; });
    const overflow = await page.evaluate(() => {
      const main = document.querySelector('main');
      return document.documentElement.scrollWidth > innerWidth || main.scrollWidth > main.clientWidth + 1;
    });
    assert(!overflow, `No horizontal overflow at ${width}×${height}`);
    await page.getByRole('link', { name: 'View full timetable', exact: true }).scrollIntoViewIfNeeded();
    assert(await page.getByRole('link', { name: 'View full timetable', exact: true }).isVisible());
  }
  console.log('PASS: desktop, short-screen, tablet and mobile content stays reachable without horizontal overflow');

  for (const [width, height] of [[1440, 1000], [1366, 600], [390, 1000]]) {
    await page.setViewportSize({ width, height });
    const original = await page.locator('.desk-intro').evaluate(el => parseFloat(getComputedStyle(el).fontSize));
    await page.evaluate(() => { document.documentElement.style.fontSize = '200%'; });
    const enlarged = await page.locator('.desk-intro').evaluate(el => parseFloat(getComputedStyle(el).fontSize));
    assert(enlarged >= original * 2, 'Overview text supports 200% enlargement');
    assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `No page overflow at 200% text and ${width}px`);
    if (width >= 1100) {
      assert(await page.getByRole('navigation', { name: 'Main navigation' }).evaluate(el => el.clientHeight >= 100), 'Enlarged text preserves usable navigation on short screens');
      await page.getByRole('link', { name: 'Timetable', exact: true }).scrollIntoViewIfNeeded();
      const link = page.getByRole('link', { name: 'Timetable', exact: true });
      await link.click();
      await page.getByRole('heading', { name: 'Weekly timetable', exact: true }).waitFor();
      await page.getByRole('link', { name: 'Overview', exact: true }).click();
    }
    await page.getByRole('link', { name: 'View full timetable', exact: true }).scrollIntoViewIfNeeded();
    await page.evaluate(() => { document.documentElement.style.fontSize = ''; });
  }
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.locator('main').evaluate(el => { el.scrollTop = 0; });
  await page.getByRole('region', { name: 'Teaching overview' }).getByRole('link', { name: 'View timetable', exact: true }).focus();
  await page.keyboard.press('Tab');
  assert(await page.getByRole('link', { name: 'Take attendance', exact: true }).evaluate(el =>
    el.matches(':focus-visible') && getComputedStyle(el).outlineStyle === 'solid'
  ));
  await page.emulateMedia({ reducedMotion: 'reduce' });
  assert.equal(await page.locator('.sidebar').evaluate(el => getComputedStyle(el).transitionDuration), '0s');
  console.log('PASS: 200% text, keyboard focus and reduced-motion preference');
  await page.screenshot({ path: 'artifacts/dimensional-desktop.png', animations: 'disabled' });
} finally {
  await browser.close();
}
