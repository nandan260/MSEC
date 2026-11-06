import React, { useState } from 'react';
import { getUser, setUser } from '../api';
import { authApi } from '../auth-api';

// Set a password (first time) or change it. Lives on the Profile screen.
export default function PasswordSection() {
  const [hasPassword, setHasPassword] = useState(() => !!getUser()?.has_password);
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);

  async function save(e) {
    e.preventDefault();
    if (next.length < 8) { setMsg({ bad: true, text: 'Use at least 8 characters.' }); return; }
    setBusy(true);
    setMsg(null);
    try {
      await authApi.setPassword(hasPassword ? current : '', next);
      const user = getUser();
      if (user) setUser({ ...user, has_password: true });
      setHasPassword(true);
      setCurrent('');
      setNext('');
      setMsg({ bad: false, text: 'Password saved.' });
    } catch (err) {
      setMsg({ bad: true, text: err.message || 'Could not save the password.' });
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="card password-section" aria-labelledby="pw-title">
      <h2 id="pw-title" className="section-title">Password</h2>
      <p className="password-section__hint">
        {hasPassword ? 'Change the password you use with your email.' : 'Set a password to sign in with your email, without a code.'}
      </p>
      <form onSubmit={save} className="password-section__form">
        {hasPassword && (
          <label className="field">
            <span>Current password</span>
            <input type="password" autoComplete="current-password" value={current} onChange={(e) => setCurrent(e.target.value)} disabled={busy} />
          </label>
        )}
        <label className="field">
          <span>{hasPassword ? 'New password' : 'Password'}</span>
          <input type="password" autoComplete="new-password" value={next} onChange={(e) => setNext(e.target.value)} disabled={busy} />
        </label>
        {msg && <p role={msg.bad ? 'alert' : 'status'} className={msg.bad ? 'ink-bad' : 'ink-good'}>{msg.text}</p>}
        <button type="submit" className="btn btn-primary" disabled={busy}>{hasPassword ? 'Change password' : 'Set password'}</button>
      </form>
    </section>
  );
}
