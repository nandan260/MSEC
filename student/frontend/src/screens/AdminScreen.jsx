import React, { useCallback, useEffect, useState } from 'react';
import { apiRequest } from '../api';
import Sheet from './Sheet';
import './admin.css';

const ROLES = ['student', 'faculty', 'admin'];
const EMPTY = { email: '', name: '', usn: '', role: 'student', branch: '', sem: '', classes: '' };

const classText = (classes) => (classes || []).map((c) => `${c.department}-${c.semester}`).join(';');

function subtitle(u) {
  if (u.role === 'student') return `${u.identifier} · ${u.department} · Sem ${u.semester}`;
  if (u.role === 'faculty') return `${u.identifier || 'Staff'} · Classes: ${classText(u.classes) || 'none'}`;
  return 'Administrator';
}

function UserSheet({ user, onClose, onSaved }) {
  const editing = !!user.id;
  const [form, setForm] = useState(editing ? {
    email: user.email, name: user.name, usn: user.identifier || '', role: user.role,
    branch: user.department || '', sem: user.semester ? String(user.semester) : '', classes: classText(user.classes),
  } : EMPTY);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [note, setNote] = useState('');
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  async function call(body, method, path) {
    setBusy(true);
    setError('');
    try {
      const { user: saved } = await apiRequest(path, { method, body: JSON.stringify(body) });
      onSaved(saved);
      return saved;
    } catch (err) {
      setError(err.message);
      return null;
    } finally {
      setBusy(false);
    }
  }

  async function save(e) {
    e.preventDefault();
    if (editing) {
      const { email: _ignored, ...rest } = form;
      if (await call(rest, 'PATCH', `/admin/roster/${user.id}`)) onClose();
    } else if (await call(form, 'POST', '/admin/roster')) onClose();
  }

  return (
    <Sheet title={editing ? 'Edit user' : 'Add user'} onClose={onClose} onSubmit={save}>
      {error && <p className="admin__error" role="alert">{error}</p>}
      {note && <p className="ink-good" role="status">{note}</p>}
      <label className="field"><span>Email</span>
        <input type="email" value={form.email} onChange={set('email')} disabled={editing || busy} aria-label="Email" />
      </label>
      <label className="field"><span>Name</span><input value={form.name} onChange={set('name')} disabled={busy} aria-label="Name" /></label>
      <label className="field"><span>USN / staff ID</span><input value={form.usn} onChange={set('usn')} disabled={busy} aria-label="USN / staff ID" /></label>
      <label className="field"><span>Role</span>
        <select value={form.role} onChange={set('role')} disabled={busy} aria-label="Role">
          {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
        </select>
      </label>
      <div className="admin__pair">
        <label className="field"><span>Branch</span><input value={form.branch} onChange={set('branch')} disabled={busy} placeholder="CSE" aria-label="Branch" /></label>
        <label className="field"><span>Semester</span><input inputMode="numeric" value={form.sem} onChange={set('sem')} disabled={busy} aria-label="Semester" /></label>
      </div>
      {form.role === 'faculty' && (
        <label className="field"><span>Classes</span>
          <input value={form.classes} onChange={set('classes')} disabled={busy} placeholder="CSE-6;CSE-4" aria-label="Classes" />
        </label>
      )}
      {editing && (
        <div className="admin__danger">
          <button type="button" className="btn" disabled={busy}
            onClick={async () => { if (await call({ logout_all: true }, 'PATCH', `/admin/roster/${user.id}`)) setNote('Signed out on every device.'); }}>
            Log out everywhere
          </button>
          <button type="button" className="btn admin__btn-bad" disabled={busy}
            onClick={async () => { if (await call({ active: !user.active }, 'PATCH', `/admin/roster/${user.id}`)) onClose(); }}>
            {user.active ? 'Disable' : 'Enable'}
          </button>
        </div>
      )}
      <div className="sheet-actions">
        <button type="button" className="btn" onClick={onClose} disabled={busy}>Cancel</button>
        <button type="submit" className="btn btn-primary" disabled={busy}>Save</button>
      </div>
    </Sheet>
  );
}

function ImportPreview({ result, onConfirm, onCancel, busy }) {
  const rows = result.created + result.updated;
  const errs = result.errors.length;
  return (
    <section className="card admin__preview" role="region" aria-label="Import preview">
      <h2 className="section-title">Import preview</h2>
      <p>{`${result.created} new · ${result.updated} updated · ${errs} error${errs === 1 ? '' : 's'}`}</p>
      {!!errs && (
        <ul className="admin__errors">
          {result.errors.map((e) => <li key={e.row}>{`Row ${e.row}${e.email ? ` (${e.email})` : ''}: ${e.message}`}</li>)}
        </ul>
      )}
      <div className="sheet-actions">
        <button type="button" className="btn" onClick={onCancel} disabled={busy}>Cancel</button>
        <button type="button" className="btn btn-primary" onClick={onConfirm} disabled={busy || rows === 0}>{`Import ${rows} rows`}</button>
      </div>
    </section>
  );
}

export default function AdminScreen() {
  const [users, setUsers] = useState([]);
  const [q, setQ] = useState('');
  const [role, setRole] = useState('');
  const [error, setError] = useState('');
  const [status, setStatus] = useState('');
  const [editing, setEditing] = useState(null);
  const [csv, setCsv] = useState(null);
  const [preview, setPreview] = useState(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const params = new URLSearchParams();
    if (q.trim()) params.set('q', q.trim());
    if (role) params.set('role', role);
    try {
      const qs = params.toString();
      const data = await apiRequest(`/admin/roster${qs ? `?${qs}` : ''}`);
      setUsers(data.users || []);
      setError('');
    } catch (err) {
      setError(err.message);
    }
  }, [q, role]);

  useEffect(() => {
    const t = setTimeout(load, q ? 250 : 0);
    return () => clearTimeout(t);
  }, [load, q]);

  async function runImport(text, dryRun) {
    setBusy(true);
    setError('');
    try {
      return await apiRequest('/admin/roster/import', { method: 'POST', body: JSON.stringify({ csv: text, dry_run: dryRun }) });
    } catch (err) {
      setError(err.message);
      return null;
    } finally {
      setBusy(false);
    }
  }

  async function onFile(e) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    const text = await file.text();
    setCsv(text);
    setStatus('');
    setPreview(await runImport(text, true));
  }

  async function confirmImport() {
    const result = await runImport(csv, false);
    if (!result) return;
    setPreview(null);
    setCsv(null);
    setStatus(`Imported: ${result.created} new, ${result.updated} updated.`);
    load();
  }

  const onSaved = (saved) => setUsers((list) => {
    const i = list.findIndex((u) => u.id === saved.id);
    return i === -1 ? [saved, ...list] : list.map((u) => (u.id === saved.id ? { ...u, ...saved } : u));
  });

  return (
    <div className="page admin">
      <div className="admin__toolbar">
        <input className="admin__search" type="search" placeholder="Search name, email or USN" aria-label="Search roster" value={q} onChange={(e) => setQ(e.target.value)} />
        <select aria-label="Role" value={role} onChange={(e) => setRole(e.target.value)}>
          <option value="">All roles</option>
          {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
        </select>
      </div>
      <div className="admin__actions">
        <button type="button" className="btn btn-primary" onClick={() => setEditing({})}>Add user</button>
        <label className="btn admin__upload">
          Upload CSV
          <input type="file" accept=".csv,text/csv" aria-label="Upload roster CSV" onChange={onFile} disabled={busy} />
        </label>
      </div>
      <p className="admin__hint">CSV columns: <code>email,name,usn,role,branch,sem,classes</code>. Classes look like <code>CSE-6;CSE-4</code>. Uploads add and update, and never delete.</p>

      {error && <p className="admin__error" role="alert">{error}</p>}
      {status && <p className="ink-good" role="status">{status}</p>}
      {preview && <ImportPreview result={preview} busy={busy} onConfirm={confirmImport} onCancel={() => { setPreview(null); setCsv(null); }} />}

      <ul className="reference-list admin__list" aria-label="Roster">
        {users.map((u) => (
          <li key={u.id} className={`admin__row${u.active ? '' : ' is-disabled'}`} aria-label={u.name}>
            <span className={`admin__role admin__role--${u.role}`}>{u.role[0].toUpperCase()}</span>
            <span className="reference-list__text">
              <strong>{u.name}</strong>
              <span>{u.email}</span>
              <span>{subtitle(u)}</span>
            </span>
            {!u.active && <span className="pill pill--bad">Disabled</span>}
            <button type="button" className="btn" aria-label={`Edit ${u.name}`} onClick={() => setEditing(u)}>Edit</button>
          </li>
        ))}
        {!users.length && !error && <li className="empty-state">No users match.</li>}
      </ul>

      {editing && <UserSheet user={editing} onClose={() => setEditing(null)} onSaved={onSaved} />}
    </div>
  );
}
