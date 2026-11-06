import React, { useEffect, useRef, useState } from 'react';
import './auth.css';
import { openExternal, isNative } from '../api';
import { authApi, googleStartUrl, saveSession } from '../auth-api';

const RESEND_SECONDS = 60;

function GoogleG() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
      <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z" />
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" />
    </svg>
  );
}

function Eye({ open }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z" />
      <circle cx="12" cy="12" r="3" />
      {!open && <path d="M3 3l18 18" />}
    </svg>
  );
}

export default function AuthScreen({ onLoginSuccess, initialError = '' }) {
  const [config, setConfig] = useState({ google: false, email: false, loaded: false });
  const [mode, setMode] = useState('password'); // password | code | forgot
  const [step, setStep] = useState('email'); // email | code (code and forgot modes)
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(false);
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [error, setError] = useState(initialError);
  const [errorCode, setErrorCode] = useState('');
  const [info, setInfo] = useState('');
  const [busy, setBusy] = useState(false);
  const [resendIn, setResendIn] = useState(0);
  const timer = useRef(null);

  useEffect(() => {
    let live = true;
    authApi.config()
      .then((c) => { if (live) setConfig({ google: !!c.google, email: !!c.email, loaded: true }); })
      .catch(() => { if (live) setConfig({ google: false, email: false, loaded: true }); });
    return () => { live = false; };
  }, []);

  useEffect(() => () => clearInterval(timer.current), []);

  function startResendTimer() {
    clearInterval(timer.current);
    setResendIn(RESEND_SECONDS);
    timer.current = setInterval(() => {
      setResendIn((s) => {
        if (s <= 1) { clearInterval(timer.current); return 0; }
        return s - 1;
      });
    }, 1000);
  }

  function switchMode(next) {
    setMode(next);
    setStep('email');
    setCode('');
    setNewPassword('');
    setError('');
    setErrorCode('');
    setInfo('');
  }

  async function run(action) {
    setBusy(true);
    setError('');
    setErrorCode('');
    try {
      await action();
    } catch (err) {
      setError(err.message || 'Something went wrong. Try again.');
      setErrorCode(err.code || '');
    } finally {
      setBusy(false);
    }
  }

  const finish = (session) => onLoginSuccess(saveSession(session));

  const submitPassword = () => run(async () => {
    if (!email.trim() || !password) throw new Error('Enter your email and password.');
    finish(await authApi.login(email.trim(), password, remember));
  });

  const sendCode = () => run(async () => {
    if (!email.trim()) throw new Error('Enter your email.');
    const res = await authApi.requestCode(email.trim(), mode === 'forgot' ? 'reset' : 'login');
    setInfo(res.message);
    setStep('code');
    startResendTimer();
  });

  const verify = () => run(async () => {
    if (code.length !== 6) throw new Error('Enter the 6-digit code.');
    if (mode === 'forgot') {
      if (newPassword.length < 8) throw new Error('Use at least 8 characters.');
      finish(await authApi.resetPassword(email.trim(), code, newPassword));
    } else {
      finish(await authApi.verifyCode(email.trim(), code, remember));
    }
  });

  function onSubmit(e) {
    e.preventDefault();
    if (busy) return;
    if (mode === 'password') submitPassword();
    else if (step === 'email') sendCode();
    else verify();
  }

  async function google() {
    const url = googleStartUrl(remember);
    if (isNative()) await openExternal(url);
    else window.location.assign(url);
  }

  const title = mode === 'forgot' ? 'Reset your password' : 'Welcome back';
  const subtitle = mode === 'forgot'
    ? "We'll email you a code to set a new password."
    : 'Sign in to continue to MSEC.';

  return (
    <div className="auth" data-qa="auth-screen">
      <header className="auth__brand">
        <img src="/favicon.svg" width="40" height="40" alt="" />
        <span className="auth__wordmark">MSEC<small>Student</small></span>
      </header>

      <main className="auth__panel">
        <h1 className="auth__title">{title}</h1>
        <p className="auth__sub">{subtitle}</p>

        {mode !== 'forgot' && config.google && (
          <>
            <button type="button" className="auth__google" onClick={google} disabled={busy}>
              <GoogleG />
              <span>Continue with Google</span>
            </button>
            <div className="auth__or" role="separator"><span>OR</span></div>
          </>
        )}

        {error && (
          <div className="auth__error" role="alert">
            <span>{error}</span>
            {errorCode === 'no_password' && config.email && (
              <button type="button" className="auth__link" onClick={() => switchMode('code')}>Send me a code</button>
            )}
          </div>
        )}
        {info && !error && <p className="auth__info" role="status">{info}</p>}

        <form className="auth__form" onSubmit={onSubmit} noValidate>
          <label className="auth__field">
            <span className="visually-hidden">Email</span>
            <input
              type="email"
              inputMode="email"
              autoComplete="email"
              placeholder="Email"
              aria-label="Email"
              value={email}
              disabled={busy || step === 'code'}
              onChange={(e) => setEmail(e.target.value)}
            />
          </label>

          {mode === 'password' && (
            <>
              <div className="auth__field auth__field--password">
                <input
                  id="auth-password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  placeholder="Password"
                  aria-label="Password"
                  value={password}
                  disabled={busy}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <button type="button" className="auth__eye" aria-label={showPassword ? 'Hide password' : 'Show password'} onClick={() => setShowPassword((v) => !v)}>
                  <Eye open={showPassword} />
                </button>
              </div>
              <div className="auth__row">
                <label className="auth__check">
                  <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} />
                  <span>Remember me</span>
                </label>
                {config.email && (
                  <button type="button" className="auth__link" onClick={() => switchMode('forgot')}>Forgot password?</button>
                )}
              </div>
            </>
          )}

          {mode !== 'password' && step === 'code' && (
            <>
              <label className="auth__field">
                <span className="visually-hidden">6-digit code</span>
                <input
                  className="auth__code"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  placeholder="6-digit code"
                  aria-label="6-digit code"
                  maxLength={6}
                  value={code}
                  disabled={busy}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                />
              </label>
              {mode === 'forgot' && (
                <label className="auth__field">
                  <span className="visually-hidden">New password</span>
                  <input
                    type="password"
                    autoComplete="new-password"
                    placeholder="New password (8+ characters)"
                    aria-label="New password"
                    value={newPassword}
                    disabled={busy}
                    onChange={(e) => setNewPassword(e.target.value)}
                  />
                </label>
              )}
              {mode === 'code' && (
                <label className="auth__check">
                  <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} />
                  <span>Remember me</span>
                </label>
              )}
            </>
          )}

          <button type="submit" className="auth__submit" disabled={busy}>
            {mode === 'password' ? 'Sign in'
              : step === 'email' ? 'Send code'
                : mode === 'forgot' ? 'Reset password' : 'Verify'}
          </button>

          {mode !== 'password' && step === 'code' && (
            <button type="button" className="auth__link auth__link--center" disabled={busy || resendIn > 0} onClick={sendCode}>
              {resendIn > 0 ? `Resend in ${resendIn}s` : 'Resend code'}
            </button>
          )}
        </form>

        {config.email && mode === 'password' && (
          <button type="button" className="auth__link auth__link--center" onClick={() => switchMode('code')}>
            Sign in with a code instead
          </button>
        )}
        {mode !== 'password' && (
          <button type="button" className="auth__link auth__link--center" onClick={() => switchMode('password')}>
            {mode === 'forgot' ? 'Back to sign in' : 'Use password instead'}
          </button>
        )}

        <p className="auth__footer">New here? <strong>Use the Gmail your college registered.</strong></p>
      </main>
    </div>
  );
}
