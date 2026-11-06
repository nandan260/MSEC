import time

import jwt
import pytest

from database import get_db
from auth.guard import PUBLIC_ENDPOINTS
from helpers import ALEX, FACULTY, ADMIN, auth, make_user, token_for


def test_no_token_401(client):
    r = client.get('/api/dashboard/summary')
    assert r.status_code == 401
    assert r.get_json() == {'error': 'Sign in to continue.'}


def test_valid_token_ok(client):
    assert client.get('/api/dashboard/summary', headers=auth(ALEX)).status_code == 200


def test_tampered_token_401(client):
    tok = token_for(ALEX)
    head, body, sig = tok.split('.')
    bad = f"{head}.{body}.{'A' if sig[0] != 'A' else 'B'}{sig[1:]}"
    assert client.get('/api/dashboard/summary', headers={'Authorization': f'Bearer {bad}'}).status_code == 401
    forged = jwt.encode({'sub': '1', 'role': 'admin', 'tv': 0, 'iat': 1, 'exp': 9999999999}, 'wrong-secret', algorithm='HS256')
    assert client.get('/api/dashboard/summary', headers={'Authorization': f'Bearer {forged}'}).status_code == 401


def test_expired_token_401(client):
    old = token_for(ALEX, now=time.time() - 8 * 24 * 3600)
    assert client.get('/api/dashboard/summary', headers={'Authorization': f'Bearer {old}'}).status_code == 401


def test_token_version_bump_401(client):
    email = 'tv@gmail.com'
    make_user(email)
    h = auth(email)
    assert client.get('/api/auth/me', headers=h).status_code == 200
    conn = get_db(); conn.execute("UPDATE users SET token_version = token_version + 1 WHERE email = ?", (email,)); conn.commit(); conn.close()
    assert client.get('/api/auth/me', headers=h).status_code == 401


def test_disabled_user_401(client):
    email = 'off@gmail.com'
    make_user(email)
    h = auth(email)
    conn = get_db(); conn.execute("UPDATE users SET active = 0 WHERE email = ?", (email,)); conn.commit(); conn.close()
    assert client.get('/api/auth/me', headers=h).status_code == 401


def _fill(rule):
    path = rule.rule
    for arg in rule.arguments:
        path = path.replace(f'<int:{arg}>', '1').replace(f'<string:{arg}>', 'x').replace(f'<path:{arg}>', 'x').replace(f'<{arg}>', 'x')
    return path


def test_every_non_public_api_rule_requires_auth(app, client):
    checked = 0
    for rule in app.url_map.iter_rules():
        if not rule.rule.startswith('/api/') or rule.endpoint in PUBLIC_ENDPOINTS:
            continue
        for method in sorted(rule.methods - {'HEAD', 'OPTIONS'}):
            r = client.open(_fill(rule), method=method)
            assert r.status_code == 401, f'{method} {rule.rule} -> {r.status_code}'
            checked += 1
    assert checked > 100


def test_student_cannot_call_staff_route(client):
    r = client.put('/api/academics/marks/1', json={'cie_marks': 50}, headers=auth(ALEX))
    assert r.status_code == 403


def test_student_cannot_call_admin_route(client):
    assert client.get('/api/fees/admin/overview', headers=auth(ALEX)).status_code == 403
    assert client.get('/api/fees/admin/overview', headers=auth(FACULTY)).status_code == 403
    assert client.get('/api/fees/admin/overview', headers=auth(ADMIN)).status_code == 200


def test_download_token_only_for_downloads(client):
    r = client.post('/api/auth/download-token', headers=auth(ALEX))
    assert r.status_code == 200
    dl = r.get_json()['token']
    # Accepted on a download endpoint via ?dl=
    assert client.get('/api/notes/1/download', query_string={'dl': dl}).status_code != 401
    # Rejected anywhere else, and as a bearer token
    assert client.get('/api/dashboard/summary', query_string={'dl': dl}).status_code == 401
    assert client.get('/api/notes/1/download', headers={'Authorization': f'Bearer {dl}'}).status_code == 401
    # Session tokens are not accepted in the query string
    assert client.get('/api/notes/1/download', query_string={'dl': token_for(ALEX)}).status_code == 401
