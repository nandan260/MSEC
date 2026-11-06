"""Roster validation and upsert shared by the admin API and CSV import."""
import sqlite3

from .users import ROLES, email_allowed, normalize_email

CSV_COLUMNS = ('email', 'name', 'usn', 'role', 'branch', 'sem', 'classes')


class RosterError(ValueError):
    pass


def parse_classes(value):
    """'CSE-6;CSE-4' or [{'department','semester'}] -> sorted unique list of (department, semester)."""
    if value in (None, ''):
        return []
    items = []
    if isinstance(value, str):
        for part in value.replace(',', ';').split(';'):
            part = part.strip()
            if not part:
                continue
            if '-' not in part:
                raise RosterError(f'Class "{part}" must look like BRANCH-SEM, for example CSE-6.')
            dept, sem = part.rsplit('-', 1)
            items.append((dept.strip(), sem.strip()))
    elif isinstance(value, list):
        for c in value:
            if not isinstance(c, dict):
                raise RosterError('Classes must be a list of {department, semester}.')
            items.append((str(c.get('department', '')).strip(), c.get('semester')))
    else:
        raise RosterError('Classes must be text like CSE-6;CSE-4.')
    out = set()
    for dept, sem in items:
        try:
            sem = int(sem)
        except (TypeError, ValueError):
            raise RosterError(f'Class semester for "{dept}" must be a number.') from None
        if not dept or not 1 <= sem <= 8:
            raise RosterError('Each class needs a branch and a semester from 1 to 8.')
        out.add((dept, sem))
    return sorted(out)


def clean(record):
    """Validate an input record (CSV row or JSON). Returns a normalized dict."""
    email = normalize_email(record.get('email'))
    if not email_allowed(email):
        raise RosterError('Email must be valid and on an allowed domain.')
    name = (record.get('name') or '').strip()
    if not name:
        raise RosterError('Name is required.')
    role = (record.get('role') or 'student').strip().lower()
    if role not in ROLES:
        raise RosterError('Role must be student, faculty or admin.')
    usn = (record.get('usn') or record.get('identifier') or '').strip().upper()
    branch = (record.get('branch') or record.get('department') or '').strip()
    sem_raw = record.get('sem', record.get('semester'))
    semester = 0
    if sem_raw not in (None, ''):
        try:
            semester = int(sem_raw)
        except (TypeError, ValueError):
            raise RosterError('Semester must be a number.') from None
    if role == 'student':
        if not usn:
            raise RosterError('USN is required for students.')
        if not branch:
            raise RosterError('Branch is required for students.')
        if not 1 <= semester <= 8:
            raise RosterError('Semester must be from 1 to 8 for students.')
    classes = parse_classes(record.get('classes')) if role == 'faculty' else []
    return {
        'email': email, 'name': name, 'role': role, 'identifier': usn,
        'department': branch, 'semester': semester, 'classes': classes,
        'has_classes': 'classes' in record and role == 'faculty',
    }


def upsert(conn, rec, allow_update=True):
    """Insert or update one cleaned record. Returns 'created' or 'updated'. Does not commit."""
    row = conn.execute("SELECT * FROM users WHERE email = ?", (rec['email'],)).fetchone()
    if row and not allow_update:
        raise RosterError('A user with this email already exists.')
    try:
        if row:
            conn.execute(
                "UPDATE users SET name = ?, role = ?, identifier = ?, department = ?, semester = ? WHERE id = ?",
                (rec['name'], rec['role'], rec['identifier'], rec['department'], rec['semester'], row['id']),
            )
            uid, result = row['id'], 'updated'
        else:
            cur = conn.execute(
                "INSERT INTO users (email, role, name, identifier, department, semester) VALUES (?, ?, ?, ?, ?, ?)",
                (rec['email'], rec['role'], rec['name'], rec['identifier'], rec['department'], rec['semester']),
            )
            uid, result = cur.lastrowid, 'created'
        if rec['role'] == 'student':
            prof = conn.execute("SELECT id FROM student_profiles WHERE user_id = ?", (uid,)).fetchone()
            if prof:
                conn.execute("UPDATE student_profiles SET name = ?, usn = ?, department = ?, semester = ?, email = ? WHERE id = ?",
                             (rec['name'], rec['identifier'], rec['department'], rec['semester'], rec['email'], prof['id']))
            else:
                conn.execute("INSERT INTO student_profiles (user_id, usn, name, department, semester, email) VALUES (?, ?, ?, ?, ?, ?)",
                             (uid, rec['identifier'], rec['name'], rec['department'], rec['semester'], rec['email']))
        if rec['role'] == 'faculty' and (rec['has_classes'] or result == 'created'):
            set_classes(conn, uid, rec['classes'])
    except sqlite3.IntegrityError:
        raise RosterError('USN or Google account is already used by another user.') from None
    return uid, result


def set_classes(conn, uid, classes):
    conn.execute("DELETE FROM teacher_classes WHERE user_id = ?", (uid,))
    conn.executemany("INSERT INTO teacher_classes (user_id, department, semester) VALUES (?, ?, ?)",
                     [(uid, d, s) for d, s in classes])
