"""HS256 session tokens."""
import os
import time

import jwt

DAY = 24 * 3600
ALGORITHM = 'HS256'


def secret():
    value = os.environ.get('AUTH_SECRET', '')
    if len(value) < 32:
        if os.environ.get('FLASK_ENV') == 'production':
            raise RuntimeError('AUTH_SECRET must be set (32+ characters) in production.')
        value = 'dev-only-insecure-secret-change-me-0000000000'
    return value


def issue_token(user_row, remember=False, now=None):
    now = int(now or time.time())
    payload = {
        'sub': str(user_row['id']),
        'role': user_row['role'],
        'tv': int(user_row['token_version'] or 0),
        'iat': now,
        'exp': now + (30 if remember else 7) * DAY,
    }
    return jwt.encode(payload, secret(), algorithm=ALGORITHM)


DOWNLOAD_TTL = 5 * 60


def issue_download_token(user_row, now=None):
    now = int(now or time.time())
    payload = {'sub': str(user_row['id']), 'role': user_row['role'], 'tv': int(user_row['token_version'] or 0),
               'iat': now, 'exp': now + DOWNLOAD_TTL, 'scope': 'download'}
    return jwt.encode(payload, secret(), algorithm=ALGORITHM)


def decode_token(token):
    try:
        return jwt.decode(token, secret(), algorithms=[ALGORITHM], options={'require': ['sub', 'exp', 'iat']})
    except jwt.PyJWTError:
        return None


def verify_token(conn, token, scope=None):
    """Return the active user row the token belongs to, or None. Session tokens have no scope."""
    claims = decode_token(token or '')
    if not claims or claims.get('scope') != scope:
        return None
    try:
        uid = int(claims['sub'])
    except (TypeError, ValueError):
        return None
    row = conn.execute("SELECT * FROM users WHERE id = ?", (uid,)).fetchone()
    if not row or row['active'] != 1 or int(claims.get('tv', -1)) != int(row['token_version'] or 0):
        return None
    return row
