// Teacher sign-in: the same MSEC accounts as the student app (Flask auth server via /auth-api).
import { esc } from './views.js';
export const TOKEN_KEY = 'msec-teacher-token';
export const AUTH_BASE = '/auth-api';
export const getToken = (s = localStorage) => s.getItem(TOKEN_KEY);
export const setToken = (t, s = localStorage) => (t ? s.setItem(TOKEN_KEY, t) : s.removeItem(TOKEN_KEY));
export const isStaff = (u) => !!u && (u.role === 'faculty' || u.role === 'admin');
export class AuthError extends Error {
    status;
    code;
    constructor(message, status = 0, code = '') {
        super(message);
        this.status = status;
        this.code = code;
    }
}
/** Adds the bearer token to /api and /auth-api requests; a 401 on a signed-in request fires msec:unauthorized. */
export function installFetchAuth(win = window, store = localStorage) {
    const w = win;
    if (w.__msecFetchAuth)
        return;
    w.__msecFetchAuth = true;
    const original = win.fetch.bind(win);
    win.fetch = (async (input, init = {}) => {
        const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
        const path = url.replace(/^https?:\/\/[^/]+/, '');
        if (!path.startsWith('/api/') && !path.startsWith(`${AUTH_BASE}/`))
            return original(input, init);
        const token = getToken(store);
        const headers = new Headers(init.headers);
        if (token && !headers.has('Authorization'))
            headers.set('Authorization', `Bearer ${token}`);
        const response = await original(input, { ...init, headers });
        if (response.status === 401 && token && !/\/auth\/(login|code|google|config)/.test(path)) {
            setToken(null, store);
            win.dispatchEvent(new Event('msec:unauthorized'));
        }
        return response;
    });
}
async function call(path, body) {
    let res;
    try {
        res = await fetch(`${AUTH_BASE}/api${path}`, body === undefined ? {} : {
            method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
        });
    }
    catch {
        throw new AuthError('Cannot reach the sign-in server. Check your connection.');
    }
    const data = await res.json().catch(() => ({}));
    if (!res.ok)
        throw new AuthError(data.error || `Request failed (${res.status}).`, res.status, data.code || '');
    return data;
}
export const authApi = {
    config: () => call('/auth/config'),
    me: () => call('/auth/me'),
    login: (email, password, remember) => call('/auth/login', { email, password, remember }),
    requestCode: (email, purpose = 'login') => call('/auth/code/request', { email, purpose }),
    verifyCode: (email, code, remember) => call('/auth/code/verify', { email, code, remember }),
    resetPassword: (email, code, newPassword) => call('/auth/password/reset', { email, code, new_password: newPassword }),
    exchangeGoogle: (code) => call('/auth/google/exchange', { code }),
    logoutAll: () => call('/auth/logout-all', {}),
    classes: () => call('/teacher/classes'),
    students: (department, semester) => call(`/teacher/students?department=${encodeURIComponent(department)}&semester=${semester}`),
};
export const googleStartUrl = (remember, start = `${AUTH_BASE}/api/auth/google/start`) => `${start}?platform=teacher${remember ? '&remember=1' : ''}`;
export const GOOGLE_ERRORS = {
    not_registered: "This email isn't registered with MSEC. Use the Gmail your college registered.",
    google_conflict: "This Google account doesn't match the registered one. Ask your admin.",
    google_cancelled: 'Google sign-in was cancelled.',
    google_failed: 'Google sign-in failed. Try again.',
};
export function parseAuthReturn(hash) {
    const i = hash.indexOf('auth-return');
    if (i === -1)
        return null;
    const params = new URLSearchParams(hash.slice(i).split('?')[1] || '');
    if (params.get('code'))
        return { code: params.get('code') };
    if (params.get('error'))
        return { error: params.get('error') };
    return null;
}
const google = `<svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true"><path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z"/><path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/><path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z"/><path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z"/></svg>`;
/** Sign-in screen markup (same layout as the student app). All dynamic text is escaped. */
export function signInView(s) {
    const forgot = s.mode === 'forgot';
    const submit = s.mode === 'password' ? 'Sign in' : s.step === 'email' ? 'Send code' : forgot ? 'Reset password' : 'Verify';
    const codeStep = s.mode !== 'password' && s.step === 'code';
    return `<div class="t-auth"><header class="t-auth__brand"><img src="favicon.svg" width="40" height="40" alt=""><span>MSEC<small>Teacher Desk</small></span></header>
<main class="t-auth__panel"><h1>${forgot ? 'Reset your password' : 'Welcome back'}</h1>
<p class="t-auth__sub">${forgot ? "We'll email you a code to set a new password." : 'Sign in to continue to MSEC.'}</p>
${!forgot && s.google ? `<button type="button" class="t-auth__google" data-auth="google" ${s.busy ? 'disabled' : ''}>${google}<span>Continue with Google</span></button><div class="t-auth__or" role="separator"><span>OR</span></div>` : ''}
${s.error ? `<div class="t-auth__error" role="alert">${esc(s.error)}</div>` : ''}
${s.info && !s.error ? `<p class="t-auth__info" role="status">${esc(s.info)}</p>` : ''}
<form class="t-auth__form" data-auth="form" novalidate>
<input name="email" type="email" autocomplete="email" placeholder="Email" aria-label="Email" value="${esc(s.email)}" ${s.busy || codeStep ? 'disabled' : ''}>
${s.mode === 'password' ? `<div class="t-auth__pw"><input name="password" type="password" autocomplete="current-password" placeholder="Password" aria-label="Password" ${s.busy ? 'disabled' : ''}><button type="button" class="t-auth__eye" data-auth="eye" aria-label="Show password">👁</button></div>
<div class="t-auth__row"><label><input type="checkbox" name="remember"> Remember me</label>${s.emailEnabled ? '<button type="button" class="t-auth__link" data-auth="forgot">Forgot password?</button>' : ''}</div>` : ''}
${codeStep ? `<input name="code" inputmode="numeric" maxlength="6" autocomplete="one-time-code" placeholder="6-digit code" aria-label="6-digit code" class="t-auth__code">${forgot ? '<input name="new_password" type="password" autocomplete="new-password" placeholder="New password (8+ characters)" aria-label="New password">' : ''}` : ''}
<button type="submit" class="t-auth__submit" ${s.busy ? 'disabled' : ''}>${submit}</button></form>
${s.mode === 'password' && s.emailEnabled ? '<button type="button" class="t-auth__link" data-auth="code-mode">Sign in with a code instead</button>' : ''}
${s.mode !== 'password' ? `<button type="button" class="t-auth__link" data-auth="password-mode">${forgot ? 'Back to sign in' : 'Use password instead'}</button>` : ''}
<p class="t-auth__footer">New here? <strong>Use the Gmail your college registered.</strong></p></main></div>`;
}
/** College roster page: assigned classes and their students from Flask. */
export function rosterView(r) {
    const options = r.classes.map((c) => {
        const key = `${c.department}|${c.semester}`;
        return `<option value="${esc(key)}" ${key === r.selected ? 'selected' : ''}>${esc(c.department)} · Sem ${c.semester}</option>`;
    }).join('');
    const rows = r.students.map((s) => `<tr><td>${esc(s.usn)}</td><td>${esc(s.name)}</td><td>${esc(s.email)}</td><td>${s.attendance}%</td><td>${s.cgpa ?? '—'}</td></tr>`).join('');
    return `<section class="panel roster-page"><header class="roster-page__head"><div><h1>College roster</h1><p>${esc(r.user?.name || '')} · students in your assigned classes</p></div>
<button type="button" class="btn" data-auth="logout">Sign out</button></header>
${r.error ? `<p class="t-auth__error" role="alert">${esc(r.error)}</p>` : ''}
${r.classes.length ? `<label class="roster-page__pick">Class <select data-roster-class aria-label="Class">${options}</select></label>` : '<p>No classes are assigned to you yet. Ask your admin to add them.</p>'}
${r.loading ? '<p role="status">Loading students…</p>' : r.selected ? (rows ? `<div class="table-wrap"><table class="table"><thead><tr><th>USN</th><th>Name</th><th>Email</th><th>Attendance</th><th>CGPA</th></tr></thead><tbody>${rows}</tbody></table></div>` : '<p>No students in this class yet.</p>') : ''}
</section>`;
}
