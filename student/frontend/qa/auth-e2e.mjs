// End-to-end sign-in checks against running servers.
// Needs: Flask on :5000 (AUTH_DEV_LOG_CODES=1, FLASK log at $FLASK_LOG), Vite on :3000, teacher web on :4173.
// QA_BASE=http://localhost:3000 TEACHER_BASE=http://localhost:4173 FLASK_LOG=/path/flask.log CHROMIUM_PATH=... node qa/auth-e2e.mjs
import assert from 'node:assert/strict';
import { readFileSync, mkdirSync } from 'node:fs';
import { chromium } from 'playwright';

const base = process.env.QA_BASE || 'http://localhost:3000';
const teacher = process.env.TEACHER_BASE || 'http://localhost:4173';
const flaskLog = process.env.FLASK_LOG;
const out = new URL('./out/auth/', import.meta.url);
mkdirSync(out, { recursive: true });

const latestCode = (email, purpose = 'login') => {
  const lines = readFileSync(flaskLog, 'utf8').split('\n').filter((l) => l.includes(`${purpose} code for ${email}:`));
  return lines.at(-1)?.split(': ').at(-1)?.trim();
};

const browser = await chromium.launch({ headless: true, ...(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {}) });
const results = [];
const step = async (name, fn) => { await fn(); results.push(`ok  ${name}`); };

try {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' });
  await ctx.addInitScript(() => sessionStorage.setItem('msec-splash-seen', '1'));
  const page = await ctx.newPage();
  const nav = page.getByRole('navigation', { name: 'Primary' });
  const pw = page.getByRole('textbox', { name: 'Password' });
  const signIn = page.getByRole('button', { name: 'Sign in', exact: true });

  await step('signed-out visitors see sign-in', async () => {
    await page.goto(base);
    await page.getByRole('heading', { name: 'Welcome back' }).waitFor();
    await page.screenshot({ path: new URL('signin-390.png', out).pathname });
  });

  await step('wrong password shows generic error and keeps email', async () => {
    await page.getByLabel('Email').fill('student@college.edu');
    await pw.fill('wrong-password');
    await signIn.click();
    assert.match(await page.getByRole('alert').textContent(), /Invalid email or password/);
    assert.equal(await page.getByLabel('Email').inputValue(), 'student@college.edu');
  });

  await step('password sign-in reaches the dashboard with Alex data', async () => {
    await pw.fill('student123');
    await signIn.click();
    await nav.waitFor();
    assert.equal(await page.locator('h1').first().textContent(), 'Hi, Alex');
  });

  await step('expired session returns to the same screen after sign-in', async () => {
    await nav.getByRole('button', { name: 'Timetable', exact: true }).click();
    await page.getByRole('heading', { name: 'Timetable' }).waitFor();
    await page.evaluate(() => localStorage.setItem('auth_token', 'bad.token.value'));
    await nav.getByRole('button', { name: 'Academics', exact: true }).click();
    await page.getByText('Your session ended').waitFor();
    await page.getByLabel('Email').fill('student@college.edu');
    await pw.fill('student123');
    await signIn.click();
    await nav.waitFor();
    assert.ok(['Academics', 'Timetable'].includes(await page.locator('h1').first().textContent()));
  });

  await step('email code sign-in', async () => {
    await nav.getByRole('button', { name: 'More', exact: true }).click();
    await page.getByRole('button', { name: 'Log out', exact: true }).click();
    await page.getByRole('heading', { name: 'Welcome back' }).waitFor();
    await page.getByRole('button', { name: 'Sign in with a code instead' }).click();
    await page.getByLabel('Email').fill('student@college.edu');
    await page.getByRole('button', { name: 'Send code' }).click();
    await page.getByLabel('6-digit code').waitFor();
    await page.waitForTimeout(500);
    await page.getByLabel('6-digit code').fill(latestCode('student@college.edu'));
    await page.getByRole('button', { name: 'Verify' }).click();
    await nav.waitFor();
  });

  await step('log out everywhere revokes the token', async () => {
    const old = await page.evaluate(() => localStorage.getItem('auth_token'));
    await nav.getByRole('button', { name: 'More', exact: true }).click();
    await page.getByRole('button', { name: 'Log out everywhere' }).click();
    await page.getByRole('heading', { name: 'Welcome back' }).waitFor();
    const status = await page.evaluate(async (t) => (await fetch('/api/auth/me', { headers: { Authorization: `Bearer ${t}` } })).status, old);
    assert.equal(status, 401);
  });

  await step('desktop sign-in layout', async () => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.screenshot({ path: new URL('signin-1280.png', out).pathname });
    await page.setViewportSize({ width: 390, height: 844 });
  });

  await step('admin imports a class and a teacher via CSV preview', async () => {
    await page.getByLabel('Email').fill('admin@college.edu');
    await pw.fill('admin123');
    await signIn.click();
    await nav.waitFor();
    await nav.getByRole('button', { name: 'More', exact: true }).click();
    await page.getByRole('button', { name: /Admin: Roster/ }).click();
    await page.getByRole('listitem', { name: 'Alex Kumar' }).waitFor();
    const csv = 'email,name,usn,role,branch,sem,classes\nfaculty@college.edu,Dr. K. V. Sharma,EMP-CS104,faculty,Computer Science & Engineering,,Computer Science & Engineering-6\nqa.student@gmail.com,QA Student,1ME23CS999,student,Computer Science & Engineering,6,\n';
    await page.getByLabel('Upload roster CSV').setInputFiles({ name: 'roster.csv', mimeType: 'text/csv', buffer: Buffer.from(csv) });
    const preview = page.getByRole('region', { name: 'Import preview' });
    await preview.waitFor();
    await page.screenshot({ path: new URL('admin-preview-390.png', out).pathname });
    await preview.getByRole('button', { name: /^Import \d+ rows$/ }).click();
    await page.getByRole('status').filter({ hasText: 'Imported' }).waitFor();
    await nav.getByRole('button', { name: 'More', exact: true }).click();
    await page.getByRole('button', { name: 'Log out', exact: true }).click();
  });

  await step('a second student sees empty personal data', async () => {
    const res = await page.evaluate(async () => {
      const r = await fetch('/api/auth/code/request', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: 'qa.student@gmail.com' }) });
      return r.status;
    });
    assert.equal(res, 200);
    await page.waitForTimeout(500);
    const summary = await page.evaluate(async (code) => {
      const v = await (await fetch('/api/auth/code/verify', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: 'qa.student@gmail.com', code }) })).json();
      return (await fetch('/api/dashboard/summary', { headers: { Authorization: `Bearer ${v.token}` } })).json();
    }, latestCode('qa.student@gmail.com'));
    assert.equal(summary.student.name, 'QA Student');
    assert.equal(summary.student.overall_attendance, 0);
  });

  await ctx.close();

  const tctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  await tctx.addInitScript(() => sessionStorage.setItem('msec-splash-seen', '1'));
  const tp = await tctx.newPage();
  await step('teacher desk is gated and students are refused', async () => {
    await tp.goto(teacher);
    await tp.getByRole('heading', { name: 'Welcome back' }).waitFor();
    await tp.screenshot({ path: new URL('teacher-signin-1280.png', out).pathname });
    await tp.getByLabel('Email').fill('student@college.edu');
    await tp.getByRole('textbox', { name: 'Password' }).fill('student123');
    await tp.getByRole('button', { name: 'Sign in', exact: true }).click();
    await tp.getByText('This sign-in is for teachers').waitFor();
  });

  await step('teacher signs in and sees only their class roster', async () => {
    await tp.getByLabel('Email').fill('faculty@college.edu');
    await tp.getByRole('textbox', { name: 'Password' }).fill('faculty123');
    await tp.getByRole('button', { name: 'Sign in', exact: true }).click();
    await tp.locator('.sidebar, nav').first().waitFor();
    await tp.goto(`${teacher}/#roster`);
    await tp.getByRole('heading', { name: 'College roster' }).waitFor();
    await tp.getByRole('cell', { name: 'Alex Kumar' }).waitFor();
    await tp.screenshot({ path: new URL('teacher-roster-1280.png', out).pathname });
  });
  await tctx.close();
} finally {
  console.log(results.join('\n'));
  await browser.close();
}
