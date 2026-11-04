import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';

const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROME_PATH || '/usr/bin/google-chrome-stable', args: ['--no-sandbox'] });
const base = process.env.BASE_URL || 'http://localhost:4173';
const routes = ['overview', 'classes', 'students', 'attendance', 'assignments', 'assessments', 'analytics', 'ai', 'materials', 'timetable', 'announcements', 'progress', 'doubts', 'parents', 'leave', 'reports', 'profile'];
const errors = [];
await mkdir('artifacts', { recursive: true });
try {
  for (const viewport of [{ width: 1440, height: 900 }, { width: 1366, height: 768 }, { width: 1024, height: 768 }, { width: 390, height: 844 }, { width: 1440, height: 600 }]) {
    const page = await browser.newPage({ viewport });
    page.on('pageerror', error => errors.push(error.message));
    for (const route of routes) {
      await page.goto(`${base}/#${route}`);
      await page.getByRole('heading', { level: 1 }).waitFor();
      const sizes = await page.evaluate(() => {
        const main = document.querySelector('main');
        const box = main.getBoundingClientRect();
        return { pageHeight: document.documentElement.scrollHeight, pageWidth: document.documentElement.scrollWidth, mainHeight: main.clientHeight, contentHeight: main.scrollHeight, bottom: box.bottom, viewportHeight: innerHeight, viewportWidth: innerWidth };
      });
      assert(sizes.pageHeight <= sizes.viewportHeight + 1, `${route} ${viewport.width}: document scrolls vertically`);
      assert(sizes.pageWidth <= sizes.viewportWidth + 1, `${route} ${viewport.width}: document scrolls horizontally`);
      assert(sizes.contentHeight <= sizes.mainHeight + 1, `${route} ${viewport.width}x${viewport.height}: whole page content scrolls (${sizes.contentHeight}/${sizes.mainHeight})`);
      assert(sizes.bottom <= sizes.viewportHeight + 1, `${route}: content extends past viewport`);
    }
    await page.goto(`${base}/#overview`);
    await page.getByRole('tab', { name: 'Today', exact: true }).waitFor();
    await page.getByRole('tab', { name: 'Today', exact: true }).focus();
    await page.keyboard.press('ArrowRight');
    assert.equal(await page.getByRole('tab', { name: 'Insights', exact: true }).getAttribute('aria-selected'), 'true');
    assert(await page.getByRole('heading', { name: 'Learning health', exact: true }).isVisible());
    await page.getByRole('tab', { name: 'Workspace', exact: true }).click();
    assert(await page.getByRole('heading', { name: 'My workspace', exact: true }).isVisible());
    await page.screenshot({ path: `artifacts/viewport-${viewport.width}-${viewport.height}.png` });
    await page.close();
    console.log(`PASS: 17 routes fit ${viewport.width}x${viewport.height}; overview tabs work`);
  }
  const page = await browser.newPage({ viewport: { width: 1366, height: 768 } });
  await page.goto(`${base}/#students`);
  await page.getByRole('heading', { level: 1 }).waitFor();
  const lastView = page.getByRole('button', { name: 'View profile', exact: true }).last();
  await lastView.scrollIntoViewIfNeeded();
  assert(await page.locator('.table-wrap').evaluate(element => element.scrollTop > 0), 'Long student list scrolls inside its table');
  await lastView.click();
  assert(await page.getByRole('dialog').isVisible());
  await page.getByRole('button', { name: 'Close dialog', exact: true }).click();
  await page.goto(`${base}/#attendance`);
  await page.getByRole('button', { name: 'Mark all present', exact: true }).click();
  await page.getByRole('button', { name: 'Save attendance', exact: true }).click();
  assert(await page.getByRole('button', { name: 'Present', exact: true, pressed: true }).count() > 0);
  await page.goto(`${base}/#profile`);
  await page.getByLabel('Full name').fill('Dr. Viewport Teacher');
  await page.getByRole('button', { name: 'Save changes', exact: true }).click();
  await page.reload();
  assert.equal(await page.getByLabel('Full name').inputValue(), 'Dr. Viewport Teacher');
  await page.addStyleTag({ content: 'html { font-size: 200% !important; }' });
  await page.getByRole('button', { name: 'Save changes', exact: true }).scrollIntoViewIfNeeded();
  await page.getByRole('button', { name: 'Save changes', exact: true }).click();
  assert.deepEqual(errors, []);
  console.log('PASS: last student, attendance, profile save, enlarged text and zero runtime errors');
} finally {
  await browser.close();
}
