"""Create or update an admin account on the roster.

Usage: python seed_admin.py you@gmail.com ["Your Name"]
"""
import sys


def upsert_admin(conn, email, name=None):
    email = email.strip().lower()
    name = (name or email.split('@')[0]).strip()
    row = conn.execute("SELECT id FROM users WHERE email = ?", (email,)).fetchone()
    if row:
        conn.execute("UPDATE users SET role = 'admin', name = ?, active = 1 WHERE id = ?", (name, row[0]))
    else:
        conn.execute("INSERT INTO users (email, role, name, identifier, department, semester) VALUES (?, 'admin', ?, 'ADMIN', 'Administration', 0)",
                     (email, name))
    conn.commit()


def main(argv):
    if len(argv) < 2 or '@' not in argv[1]:
        print(__doc__.strip())
        return 2
    from database import get_db, init_db
    init_db()
    conn = get_db()
    upsert_admin(conn, argv[1], argv[2] if len(argv) > 2 else None)
    conn.close()
    print(f"Admin ready: {argv[1].strip().lower()}")
    return 0


if __name__ == '__main__':
    sys.exit(main(sys.argv))
