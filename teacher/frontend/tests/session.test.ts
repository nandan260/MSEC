import test from 'node:test';
import assert from 'node:assert/strict';
import { signInView, rosterView, installFetchAuth, parseAuthReturn, isStaff, googleStartUrl, setToken, getToken } from '../dist/session.js';

const base = { mode: 'password', step: 'email', email: '', error: '', info: '', busy: false, google: true, emailEnabled: true } as const;

test('sign-in view matches the reference layout and has no GitHub option', () => {
  const html = signInView({ ...base });
  for (const s of ['Welcome back', 'Sign in to continue to MSEC.', 'Continue with Google', '>OR<', 'aria-label="Email"', 'aria-label="Password"', 'Remember me', 'Forgot password?', '>Sign in<', 'Sign in with a code instead', 'Use the Gmail your college registered.'])
    assert.ok(html.includes(s), s);
  assert.ok(!/github/i.test(html));
});

test('sign-in view hides disabled methods and escapes text', () => {
  const html = signInView({ ...base, google: false, emailEnabled: false, error: '<img src=x onerror=alert(1)>', email: '"><script>' });
  assert.ok(!html.includes('Continue with Google'));
  assert.ok(!html.includes('Sign in with a code instead'));
  assert.ok(!html.includes('<img src=x'));
  assert.ok(!html.includes('"><script>'));
});

test('code and forgot steps', () => {
  assert.ok(signInView({ ...base, mode: 'code', step: 'email' }).includes('>Send code<'));
  const verify = signInView({ ...base, mode: 'code', step: 'code', email: 'a@gmail.com' });
  assert.ok(verify.includes('6-digit code') && verify.includes('>Verify<'));
  const reset = signInView({ ...base, mode: 'forgot', step: 'code' });
  assert.ok(reset.includes('Reset your password') && reset.includes('New password') && reset.includes('>Reset password<'));
});

test('roster view escapes data and handles empty states', () => {
  const html = rosterView({ classes: [{ department: 'CSE', semester: 6 }], selected: 'CSE|6', loading: false, error: '', user: null,
    students: [{ id: 1, name: '<b>x</b>', email: 'a@gmail.com', usn: '1MS', department: 'CSE', semester: 6, attendance: 91.5, cgpa: null }] });
  assert.ok(html.includes('CSE · Sem 6') && html.includes('91.5%') && html.includes('&lt;b&gt;'));
  assert.ok(rosterView({ classes: [], selected: '', students: [], loading: false, error: '', user: null }).includes('No classes are assigned'));
});

test('only faculty and admin are staff; return URL parsing; google start targets teacher', () => {
  assert.equal(isStaff({ role: 'faculty' }), true);
  assert.equal(isStaff({ role: 'admin' }), true);
  assert.equal(isStaff({ role: 'student' }), false);
  assert.deepEqual(parseAuthReturn('#/auth-return?code=abc'), { code: 'abc' });
  assert.deepEqual(parseAuthReturn('#/auth-return?error=not_registered'), { error: 'not_registered' });
  assert.equal(parseAuthReturn('#overview'), null);
  assert.equal(googleStartUrl(true, 'https://msec.example/api/auth/google/start'), 'https://msec.example/api/auth/google/start?platform=teacher&remember=1');
});

test('fetch wrapper adds the token to api calls and a 401 ends the session', async () => {
  const store = new Map<string, string>();
  const s = { getItem: (k: string) => store.get(k) ?? null, setItem: (k: string, v: string) => void store.set(k, v), removeItem: (k: string) => void store.delete(k) };
  const seen: (string | null)[] = [];
  const events: string[] = [];
  const win: any = {
    fetch: async (url: string, init: RequestInit) => { seen.push(new Headers(init.headers).get('Authorization')); return new Response('{}', { status: url.includes('expired') ? 401 : 200 }); },
    dispatchEvent: (e: Event) => { events.push(e.type); return true; },
  };
  setToken('tok', s);
  installFetchAuth(win, s);
  await win.fetch('/api/assistant/chat', {});
  await win.fetch('/auth-api/api/teacher/classes', {});
  await win.fetch('https://cdn.example/x.js', {});
  assert.deepEqual(seen, ['Bearer tok', 'Bearer tok', null]);
  await win.fetch('/api/expired', {});
  assert.deepEqual(events, ['msec:unauthorized']);
  assert.equal(getToken(s), null);
});
