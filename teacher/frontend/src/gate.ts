// Entry point: require an MSEC faculty/admin session before the Teacher Desk loads.
import {
  authApi, AuthError, getToken, GOOGLE_ERRORS, googleStartUrl, installFetchAuth, isStaff,
  parseAuthReturn, setToken, signInView, type SignInState, type Staff,
} from './session.js';

installFetchAuth();

const root = () => document.querySelector<HTMLElement>('#app')!;
let state: SignInState = { mode: 'password', step: 'email', email: '', error: '', info: '', busy: false, google: false, emailEnabled: false };
let appLoaded = false;

function paint(): void {
  document.body.classList.add('signed-out');
  root().innerHTML = signInView(state);
}

function set(patch: Partial<SignInState>): void {
  state = { ...state, ...patch };
  paint();
}

async function enter(user: Staff): Promise<void> {
  if (!isStaff(user)) {
    setToken(null);
    set({ busy: false, error: 'This sign-in is for teachers. Students use the MSEC student app.' });
    return;
  }
  (window as any).__msecTeacher = user;
  document.body.classList.remove('signed-out');
  if (appLoaded) { location.reload(); return; }
  appLoaded = true;
  root().innerHTML = '';
  await import('./app.js');
}

async function finish(session: { token: string; user: Staff }): Promise<void> {
  setToken(session.token);
  await enter(session.user);
}

async function run(action: () => Promise<void>): Promise<void> {
  set({ busy: true, error: '' });
  try {
    await action();
  } catch (err) {
    const e = err as AuthError;
    set({ busy: false, error: e.message || 'Something went wrong. Try again.' });
  }
}

document.addEventListener('click', (e) => {
  const target = (e.target as HTMLElement).closest<HTMLElement>('[data-auth]');
  if (!target || !document.body.classList.contains('signed-out')) return;
  const action = target.dataset.auth;
  const email = (document.querySelector<HTMLInputElement>('.t-auth input[name=email]')?.value || state.email).trim();
  if (action === 'google') {
    const remember = !!document.querySelector<HTMLInputElement>('.t-auth input[name=remember]')?.checked;
    location.assign(googleStartUrl(remember, state.googleStart));
  } else if (action === 'eye') {
    const pw = document.querySelector<HTMLInputElement>('.t-auth input[name=password]');
    if (pw) { pw.type = pw.type === 'password' ? 'text' : 'password'; target.setAttribute('aria-label', pw.type === 'password' ? 'Show password' : 'Hide password'); }
  } else if (action === 'code-mode' || action === 'forgot' || action === 'password-mode') {
    set({ mode: action === 'code-mode' ? 'code' : action === 'forgot' ? 'forgot' : 'password', step: 'email', email, error: '', info: '' });
  }
});

document.addEventListener('submit', (e) => {
  const form = (e.target as HTMLElement).closest<HTMLFormElement>('[data-auth=form]');
  if (!form) return;
  e.preventDefault();
  const f = new FormData(form);
  const email = String(f.get('email') ?? state.email).trim();
  const remember = f.get('remember') === 'on';
  if (state.mode === 'password') {
    run(async () => { await finish(await authApi.login(email, String(f.get('password') || ''), remember)); });
  } else if (state.step === 'email') {
    run(async () => {
      const res = await authApi.requestCode(email, state.mode === 'forgot' ? 'reset' : 'login');
      set({ busy: false, email, step: 'code', info: res.message });
    });
  } else {
    const code = String(f.get('code') || '').replace(/\D/g, '');
    run(async () => {
      if (state.mode === 'forgot') await finish(await authApi.resetPassword(state.email, code, String(f.get('new_password') || '')));
      else await finish(await authApi.verifyCode(state.email, code, remember));
    });
  }
});

window.addEventListener('msec:unauthorized', () => {
  state = { ...state, mode: 'password', step: 'email', busy: false, error: 'Your session ended. Sign in again to continue.' };
  paint();
});

async function boot(): Promise<void> {
  const ret = parseAuthReturn(location.hash);
  if (ret) history.replaceState(null, '', location.pathname + location.search);
  authApi.config().then((c) => { state = { ...state, google: c.google, emailEnabled: c.email, googleStart: c.google_start }; if (document.body.classList.contains('signed-out')) paint(); }).catch(() => {});
  if (ret?.code) {
    try { await finish(await authApi.exchangeGoogle(ret.code)); return; } catch (err) { state.error = (err as Error).message; }
  } else if (ret?.error) {
    state.error = GOOGLE_ERRORS[ret.error] || GOOGLE_ERRORS.google_failed;
  }
  if (getToken()) {
    try { await enter((await authApi.me()).user); return; } catch { setToken(null); }
  }
  paint();
}

boot();
