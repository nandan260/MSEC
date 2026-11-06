"""Email one-time codes: 6 digits, 5 minutes, 5 tries, single use, stored as HMAC."""
import hashlib
import hmac
import secrets
import time

from .tokens import secret

CODE_TTL = 5 * 60
MAX_ATTEMPTS = 5


def _digest(email, purpose, code):
    msg = f'{email}|{purpose}|{code}'.encode()
    return hmac.new(secret().encode(), msg, hashlib.sha256).hexdigest()


def create_code(conn, email, purpose):
    code = f'{secrets.randbelow(10 ** 6):06d}'
    now = time.time()
    conn.execute("UPDATE email_codes SET used_at = ? WHERE email = ? AND purpose = ? AND used_at IS NULL", (now, email, purpose))
    conn.execute(
        "INSERT INTO email_codes (email, purpose, code_hash, expires_at, attempts, created_at) VALUES (?, ?, ?, ?, 0, ?)",
        (email, purpose, _digest(email, purpose, code), now + CODE_TTL, now),
    )
    conn.commit()
    return code


def verify_code(conn, email, purpose, code):
    """'ok' | 'invalid' | 'locked'. Consumes the code on success, atomically."""
    now = time.time()
    code = (code or '').strip()
    row = conn.execute(
        "SELECT * FROM email_codes WHERE email = ? AND purpose = ? AND used_at IS NULL AND expires_at > ? ORDER BY id DESC LIMIT 1",
        (email, purpose, now),
    ).fetchone()
    if not row:
        return 'invalid'
    if row['attempts'] >= MAX_ATTEMPTS:
        return 'locked'
    if len(code) == 6 and code.isdigit() and hmac.compare_digest(row['code_hash'], _digest(email, purpose, code)):
        cur = conn.execute("UPDATE email_codes SET used_at = ? WHERE id = ? AND used_at IS NULL", (now, row['id']))
        conn.commit()
        return 'ok' if cur.rowcount == 1 else 'invalid'
    conn.execute("UPDATE email_codes SET attempts = attempts + 1 WHERE id = ?", (row['id'],))
    conn.commit()
    return 'locked' if row['attempts'] + 1 >= MAX_ATTEMPTS else 'invalid'
