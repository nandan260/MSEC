import sqlite3

from werkzeug.security import generate_password_hash, check_password_hash

import database


OLD_USERS = """
CREATE TABLE users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL CHECK(role IN ('student', 'faculty', 'admin')),
    name TEXT NOT NULL,
    identifier TEXT NOT NULL,
    department TEXT NOT NULL,
    semester INTEGER DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE notes_ref (id INTEGER PRIMARY KEY, user_id INTEGER, FOREIGN KEY(user_id) REFERENCES users(id));
"""


def old_db(path):
    conn = sqlite3.connect(path)
    conn.row_factory = sqlite3.Row
    conn.executescript(OLD_USERS)
    conn.execute("INSERT INTO users (id,email,password_hash,role,name,identifier,department,semester) VALUES (7,'Alex@Gmail.com',?,'student','Alex','1MS21CS084','CSE',6)",
                 (generate_password_hash('pw12345678'),))
    conn.execute("INSERT INTO notes_ref (id,user_id) VALUES (1,7)")
    conn.commit()
    return conn


def cols(conn, table):
    return {r[1]: r for r in conn.execute(f"PRAGMA table_info({table})")}


def test_migration_preserves_existing_users(tmp_path):
    conn = old_db(tmp_path / 'old.db')
    database.migrate_auth(conn)
    row = conn.execute("SELECT * FROM users WHERE id = 7").fetchone()
    assert row['email'] == 'alex@gmail.com'
    assert check_password_hash(row['password_hash'], 'pw12345678')
    assert row['active'] == 1 and row['token_version'] == 0 and row['google_sub'] is None
    c = cols(conn, 'users')
    assert c['password_hash'][3] == 0  # notnull flag cleared
    assert conn.execute("SELECT user_id FROM notes_ref").fetchone()[0] == 7
    for t in ('teacher_classes', 'email_codes', 'google_flows', 'login_attempts'):
        assert cols(conn, t), t
    assert conn.execute("PRAGMA foreign_key_check").fetchall() == []


def test_migration_idempotent(tmp_path):
    conn = old_db(tmp_path / 'old.db')
    database.migrate_auth(conn)
    database.migrate_auth(conn)
    assert conn.execute("SELECT COUNT(*) FROM users").fetchone()[0] == 1


def test_null_password_allowed_and_role_checked(tmp_path):
    conn = old_db(tmp_path / 'old.db')
    database.migrate_auth(conn)
    conn.execute("INSERT INTO users (email, role, name) VALUES ('t@gmail.com','faculty','T')")
    try:
        conn.execute("INSERT INTO users (email, role, name) VALUES ('x@gmail.com','hacker','X')")
        assert False, 'role check missing'
    except sqlite3.IntegrityError:
        pass


def test_seed_admin_upserts(tmp_path, monkeypatch):
    conn = old_db(tmp_path / 'old.db')
    database.migrate_auth(conn)
    import seed_admin
    seed_admin.upsert_admin(conn, 'Boss@Gmail.com', 'Boss')
    seed_admin.upsert_admin(conn, 'boss@gmail.com', 'Boss Two')
    rows = conn.execute("SELECT * FROM users WHERE email = 'boss@gmail.com'").fetchall()
    assert len(rows) == 1 and rows[0]['role'] == 'admin' and rows[0]['name'] == 'Boss Two' and rows[0]['active'] == 1
