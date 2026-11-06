"""Google OAuth: server-side authorization code flow with PKCE, state, nonce and a browser-binding cookie.

The callback never returns a session directly. It redirects back to the app with a one-time code
(60 seconds) that the app swaps for a session at /api/auth/google/exchange.
"""
import base64
import hashlib
import os
import secrets
import time
from urllib.parse import urlencode

import requests

COOKIE = 'msec_google'
COOKIE_PATH = '/api/auth/google'
FLOW_TTL = 10 * 60
EXCHANGE_TTL = 60
ANDROID_RETURN = 'msecstudent://auth-return'
AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth'
TOKEN_URL = 'https://oauth2.googleapis.com/token'


class GoogleError(Exception):
    def __init__(self, reason='google_failed'):
        super().__init__(reason)
        self.reason = reason


def google_enabled():
    return bool(os.environ.get('GOOGLE_CLIENT_ID') and os.environ.get('GOOGLE_CLIENT_SECRET'))


def public_origin():
    first = (os.environ.get('PUBLIC_ORIGIN') or 'http://localhost:5000').split(',')[0]
    return first.strip().rstrip('/')


def redirect_uri():
    return f'{public_origin()}/api/auth/google/callback'


def sha(value):
    return hashlib.sha256(value.encode()).hexdigest()


def is_hex64(value):
    return isinstance(value, str) and len(value) == 64 and all(c in '0123456789abcdef' for c in value)


def new_flow(conn, platform, remember):
    state, browser, nonce = secrets.token_hex(32), secrets.token_hex(32), secrets.token_hex(16)
    verifier = secrets.token_urlsafe(64)
    challenge = base64.urlsafe_b64encode(hashlib.sha256(verifier.encode()).digest()).rstrip(b'=').decode()
    conn.execute(
        "INSERT INTO google_flows (id, browser_hash, code_verifier, nonce, platform, expires_at, remember) VALUES (?, ?, ?, ?, ?, ?, ?)",
        (sha(state), sha(browser), verifier, nonce, platform, time.time() + FLOW_TTL, 1 if remember else 0),
    )
    conn.execute("DELETE FROM google_flows WHERE expires_at < ? AND (exchange_expires_at IS NULL OR exchange_expires_at < ?)",
                 (time.time() - 3600, time.time()))
    conn.commit()
    url = AUTH_URL + '?' + urlencode({
        'client_id': os.environ['GOOGLE_CLIENT_ID'],
        'redirect_uri': redirect_uri(),
        'response_type': 'code',
        'scope': 'openid email profile',
        'state': state,
        'nonce': nonce,
        'code_challenge': challenge,
        'code_challenge_method': 'S256',
        'prompt': 'select_account',
    })
    return url, browser


def consume_flow(conn, state, browser):
    """Claim the flow once. Returns the flow row or None."""
    if not is_hex64(state) or not is_hex64(browser):
        return None
    fid = sha(state)
    cur = conn.execute(
        "UPDATE google_flows SET browser_hash = '' WHERE id = ? AND browser_hash = ? AND expires_at > ? AND exchange_hash IS NULL",
        (fid, sha(browser), time.time()),
    )
    conn.commit()
    if cur.rowcount != 1:
        return None
    return conn.execute("SELECT * FROM google_flows WHERE id = ?", (fid,)).fetchone()


def flow_platform(conn, state):
    if not is_hex64(state):
        return 'web'
    row = conn.execute("SELECT platform FROM google_flows WHERE id = ?", (sha(state),)).fetchone()
    return row['platform'] if row else 'web'


def exchange_code(code, verifier):
    """Swap the authorization code for Google's ID token."""
    try:
        resp = requests.post(TOKEN_URL, data={
            'code': code,
            'client_id': os.environ['GOOGLE_CLIENT_ID'],
            'client_secret': os.environ['GOOGLE_CLIENT_SECRET'],
            'redirect_uri': redirect_uri(),
            'grant_type': 'authorization_code',
            'code_verifier': verifier,
        }, timeout=10)
    except requests.RequestException:
        raise GoogleError() from None
    if resp.status_code != 200:
        raise GoogleError()
    token = (resp.json() or {}).get('id_token')
    if not token:
        raise GoogleError()
    return token


def verify_id_token(token):
    from google.auth.transport import requests as google_requests
    from google.oauth2 import id_token
    try:
        return id_token.verify_oauth2_token(token, google_requests.Request(), os.environ['GOOGLE_CLIENT_ID'])
    except ValueError:
        raise GoogleError() from None


def roster_user_for(conn, payload, flow):
    """Apply the roster rule and link or check google_sub. Returns the user row."""
    from .users import normalize_email, roster_user
    if not isinstance(payload, dict) or payload.get('nonce') != flow['nonce']:
        raise GoogleError()
    sub = payload.get('sub')
    if not isinstance(sub, str) or not sub or payload.get('email_verified') is not True:
        raise GoogleError()
    row = roster_user(conn, normalize_email(payload.get('email')))
    if not row:
        raise GoogleError('not_registered')
    if row['google_sub'] and row['google_sub'] != sub:
        raise GoogleError('google_conflict')
    other = conn.execute("SELECT id FROM users WHERE google_sub = ? AND id != ?", (sub, row['id'])).fetchone()
    if other:
        raise GoogleError('google_conflict')
    if not row['google_sub']:
        conn.execute("UPDATE users SET google_sub = ? WHERE id = ? AND google_sub IS NULL", (sub, row['id']))
        conn.commit()
    return row


def issue_exchange(conn, flow, user_id):
    code = secrets.token_hex(32)
    conn.execute(
        "UPDATE google_flows SET exchange_hash = ?, exchange_user_id = ?, exchange_expires_at = ? WHERE id = ?",
        (sha(code), user_id, time.time() + EXCHANGE_TTL, flow['id']),
    )
    conn.commit()
    return code


def redeem_exchange(conn, code):
    """Single use. Returns (user_id, remember) or None."""
    if not is_hex64(code):
        return None
    row = conn.execute(
        "SELECT id, exchange_user_id, remember FROM google_flows WHERE exchange_hash = ? AND exchange_expires_at > ?",
        (sha(code), time.time()),
    ).fetchone()
    if not row:
        return None
    cur = conn.execute("DELETE FROM google_flows WHERE id = ? AND exchange_hash = ?", (row['id'], sha(code)))
    conn.commit()
    if cur.rowcount != 1:
        return None
    return row['exchange_user_id'], bool(row['remember'])


def teacher_origin():
    return (os.environ.get('TEACHER_ORIGIN') or 'http://localhost:4173').split(',')[0].strip().rstrip('/')


def return_url(platform, **params):
    if platform == 'android':
        base = ANDROID_RETURN
    elif platform == 'teacher':
        base = f'{teacher_origin()}/#/auth-return'
    else:
        base = f'{public_origin()}/#/auth-return'
    return f'{base}?{urlencode(params)}'
