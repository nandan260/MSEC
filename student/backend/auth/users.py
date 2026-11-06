"""Roster lookups and the public user shape."""
import os
import re

from flask import g

EMAIL_RE = re.compile(r'^[^@\s]+@[^@\s]+\.[^@\s]+$')
ROLES = ('student', 'faculty', 'admin')


def normalize_email(value):
    return (value or '').strip().lower()


def allowed_domains():
    raw = os.environ.get('ALLOWED_EMAIL_DOMAINS', 'gmail.com')
    return {d.strip().lower().lstrip('@') for d in raw.split(',') if d.strip()}


def email_allowed(email):
    email = normalize_email(email)
    if not EMAIL_RE.match(email):
        return False
    return email.rsplit('@', 1)[1] in allowed_domains()


def roster_user(conn, email):
    """Active roster user for an allowed email, else None."""
    email = normalize_email(email)
    if not email_allowed(email):
        return None
    row = conn.execute("SELECT * FROM users WHERE email = ? AND active = 1", (email,)).fetchone()
    return row


def classes_for(conn, user_id):
    rows = conn.execute(
        "SELECT department, semester FROM teacher_classes WHERE user_id = ? ORDER BY department, semester", (user_id,)
    ).fetchall()
    return [{'department': r['department'], 'semester': r['semester']} for r in rows]


def public_user(conn, row):
    user = {
        'id': row['id'],
        'email': row['email'],
        'role': row['role'],
        'name': row['name'],
        'identifier': row['identifier'],
        'department': row['department'],
        'semester': row['semester'],
        'has_password': bool(row['password_hash']),
    }
    if row['role'] in ('faculty', 'admin'):
        user['classes'] = classes_for(conn, row['id'])
    return user


def current_user():
    return getattr(g, 'user', None)


def current_user_id():
    return g.user['id']


def is_staff():
    return g.user['role'] in ('faculty', 'admin')


def scoped_student_id(requested=None):
    """Students always act as themselves. Staff may name a student, defaulting to themselves."""
    if not is_staff():
        return g.user['id']
    try:
        return int(requested) if requested not in (None, '') else g.user['id']
    except (TypeError, ValueError):
        return g.user['id']


def staff_can_access_student(conn, student_user_id):
    """Admins reach everyone; faculty only students in their assigned branch+semester classes."""
    if g.user['role'] == 'admin':
        return True
    if g.user['role'] != 'faculty':
        return g.user['id'] == student_user_id
    row = conn.execute(
        """SELECT 1 FROM users u JOIN teacher_classes c
           ON c.department = u.department AND c.semester = u.semester
           WHERE u.id = ? AND u.role = 'student' AND c.user_id = ?""",
        (student_user_id, g.user['id']),
    ).fetchone()
    return row is not None


def scoped_usn(requested=None):
    """Students always act as their own USN; staff may name one."""
    if not is_staff():
        return g.user['identifier']
    return (requested or '').strip() or g.user['identifier']


def scoped_name(requested=None):
    if not is_staff():
        return g.user['name']
    return (requested or '').strip() or g.user['name']


def fee_student_id(requested=None):
    """Fee records: admins may name any student; everyone else sees only their own."""
    if g.user['role'] != 'admin':
        return g.user['id']
    try:
        return int(requested) if requested not in (None, '') else g.user['id']
    except (TypeError, ValueError):
        return g.user['id']
