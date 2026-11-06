"""Admin roster management: list, create, edit, disable, CSV import."""
import csv
import io

from flask import Blueprint, g, jsonify, request

from database import get_db
from .roster import CSV_COLUMNS, RosterError, clean, parse_classes, set_classes, upsert
from .users import ROLES, public_user

bp = Blueprint('admin', __name__, url_prefix='/api/admin')
MAX_CSV_BYTES = 2_000_000


def _user_json(conn, row):
    u = public_user(conn, row)
    u['active'] = bool(row['active'])
    u['google_linked'] = bool(row['google_sub'])
    return u


@bp.get('/roster')
def roster_list():
    q = (request.args.get('q') or '').strip().lower()
    sql, params = "SELECT * FROM users WHERE 1=1", []
    if q:
        sql += " AND (LOWER(email) LIKE ? OR LOWER(name) LIKE ? OR LOWER(identifier) LIKE ?)"
        params += [f'%{q}%'] * 3
    for key, col in (('role', 'role'), ('department', 'department')):
        if request.args.get(key):
            sql += f" AND {col} = ?"
            params.append(request.args[key])
    if request.args.get('semester'):
        sql += " AND semester = ?"
        params.append(request.args.get('semester', type=int))
    sql += " ORDER BY role, department, semester, name LIMIT 2000"
    conn = get_db()
    try:
        return jsonify({'users': [_user_json(conn, r) for r in conn.execute(sql, params).fetchall()]})
    finally:
        conn.close()


@bp.post('/roster')
def roster_create():
    conn = get_db()
    try:
        rec = clean(request.get_json(silent=True) or {})
        uid, _ = upsert(conn, rec, allow_update=False)
        conn.commit()
        return jsonify({'user': _user_json(conn, conn.execute("SELECT * FROM users WHERE id = ?", (uid,)).fetchone())}), 201
    except RosterError as exc:
        conn.rollback()
        status = 409 if 'already exists' in str(exc) else 400
        return jsonify({'error': str(exc)}), status
    finally:
        conn.close()


@bp.patch('/roster/<int:user_id>')
def roster_update(user_id):
    data = request.get_json(silent=True) or {}
    conn = get_db()
    try:
        row = conn.execute("SELECT * FROM users WHERE id = ?", (user_id,)).fetchone()
        if not row:
            return jsonify({'error': 'User not found.'}), 404
        if user_id == g.user['id'] and (data.get('active') is False or data.get('role') not in (None, 'admin')):
            return jsonify({'error': "You can't disable or demote your own account."}), 400
        fields = {k: data[k] for k in ('name', 'usn', 'identifier', 'role', 'branch', 'department', 'sem', 'semester', 'classes') if k in data}
        if fields:
            merged = {
                'email': row['email'], 'name': row['name'], 'role': row['role'], 'usn': row['identifier'],
                'branch': row['department'], 'sem': row['semester'],
            }
            merged.update(fields)
            upsert(conn, clean(merged))
        if 'active' in data:
            conn.execute("UPDATE users SET active = ?, token_version = token_version + ? WHERE id = ?",
                         (1 if data['active'] else 0, 0 if data['active'] else 1, user_id))
        if data.get('logout_all'):
            conn.execute("UPDATE users SET token_version = token_version + 1 WHERE id = ?", (user_id,))
        conn.commit()
        return jsonify({'user': _user_json(conn, conn.execute("SELECT * FROM users WHERE id = ?", (user_id,)).fetchone())})
    except RosterError as exc:
        conn.rollback()
        return jsonify({'error': str(exc)}), 400
    finally:
        conn.close()


def _csv_text():
    if request.files.get('file'):
        raw = request.files['file'].read(MAX_CSV_BYTES + 1)
        dry = request.form.get('dry_run') in ('1', 'true', 'True')
    else:
        data = request.get_json(silent=True) or {}
        raw = (data.get('csv') or '').encode()
        dry = bool(data.get('dry_run'))
    if len(raw) > MAX_CSV_BYTES:
        raise RosterError('CSV is larger than 2 MB.')
    try:
        return raw.decode('utf-8-sig'), dry
    except UnicodeDecodeError:
        raise RosterError('CSV must be UTF-8 text.') from None


@bp.post('/roster/import')
def roster_import():
    try:
        text, dry_run = _csv_text()
    except RosterError as exc:
        return jsonify({'error': str(exc)}), 400
    reader = csv.DictReader(io.StringIO(text))
    headers = [h.strip().lower() for h in (reader.fieldnames or [])]
    missing = [c for c in ('email', 'name', 'usn', 'role', 'branch', 'sem') if c not in headers]
    if missing:
        return jsonify({'error': f"CSV is missing columns: {', '.join(missing)}. Expected: {','.join(CSV_COLUMNS)}"}), 400
    reader.fieldnames = headers
    created = updated = 0
    errors = []
    conn = get_db()
    try:
        conn.execute("BEGIN")  # row savepoints nest inside this, so dry runs roll back fully
        for index, raw_row in enumerate(reader, start=2):
            row = {k: (v or '').strip() for k, v in raw_row.items() if k}
            if not any(row.values()):
                continue
            conn.execute("SAVEPOINT row")
            try:
                _, result = upsert(conn, clean(row))
                conn.execute("RELEASE row")
                if result == 'created':
                    created += 1
                else:
                    updated += 1
            except RosterError as exc:
                conn.execute("ROLLBACK TO row")
                conn.execute("RELEASE row")
                errors.append({'row': index, 'email': row.get('email', ''), 'message': str(exc)})
        if dry_run:
            conn.rollback()
        else:
            conn.commit()
        return jsonify({'created': created, 'updated': updated, 'errors': errors, 'dry_run': dry_run})
    finally:
        conn.close()
