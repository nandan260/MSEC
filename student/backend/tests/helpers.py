import time

from database import get_db
from auth.tokens import issue_token


def user_row(email):
    conn = get_db()
    row = conn.execute("SELECT * FROM users WHERE email = ?", (email,)).fetchone()
    conn.close()
    return row


def make_user(email, role='student', name='Test User', department='Computer Science & Engineering', semester=6, identifier=None):
    identifier = identifier or ('T' + str(abs(hash(email)) % 10**8))
    conn = get_db()
    existing = conn.execute("SELECT id FROM users WHERE email = ?", (email,)).fetchone()
    if not existing:
        conn.execute("INSERT INTO users (email, role, name, identifier, department, semester) VALUES (?,?,?,?,?,?)",
                     (email, role, name, identifier, department, semester))
        uid = conn.execute("SELECT id FROM users WHERE email = ?", (email,)).fetchone()[0]
        if role == 'student':
            conn.execute("INSERT INTO student_profiles (user_id, usn, name, department, semester, email) VALUES (?,?,?,?,?,?)",
                         (uid, identifier, name, department, semester, email))
        conn.commit()
    conn.close()
    return user_row(email)


def token_for(email, remember=False, now=None):
    return issue_token(user_row(email), remember, now)


def auth(email):
    return {'Authorization': f'Bearer {token_for(email)}'}


ALEX = 'student@college.edu'
FACULTY = 'faculty@college.edu'
ADMIN = 'admin@college.edu'
