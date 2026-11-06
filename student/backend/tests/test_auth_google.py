import time
from urllib.parse import parse_qs, urlparse

import pytest

from database import get_db
from helpers import make_user

EMAIL = 'gstudent@gmail.com'
PAYLOAD = {}


@pytest.fixture(autouse=True)
def google_env(monkeypatch):
    monkeypatch.setenv('GOOGLE_CLIENT_ID', 'client-id.apps.googleusercontent.com')
    monkeypatch.setenv('GOOGLE_CLIENT_SECRET', 'secret')
    monkeypatch.setenv('PUBLIC_ORIGIN', 'http://localhost:3000')
    import auth.google as gmod
    monkeypatch.setattr(gmod, 'exchange_code', lambda code, verifier: 'id-token-for-' + code)
    monkeypatch.setattr(gmod, 'verify_id_token', lambda token: dict(PAYLOAD))
    make_user(EMAIL, name='G Student')
    conn = get_db(); conn.execute("UPDATE users SET google_sub = NULL WHERE email = ?", (EMAIL,)); conn.execute("DELETE FROM google_flows"); conn.commit(); conn.close()
    yield


def start(client, platform='web'):
    r = client.get(f'/api/auth/google/start?platform={platform}')
    assert r.status_code == 302
    loc = urlparse(r.headers['Location'])
    q = {k: v[0] for k, v in parse_qs(loc.query).items()}
    assert loc.netloc == 'accounts.google.com'
    assert q['code_challenge_method'] == 'S256' and q['response_type'] == 'code'
    assert q['redirect_uri'] == 'http://localhost:3000/api/auth/google/callback'
    cookie = client.get_cookie('msec_google', path='/api/auth/google')
    assert cookie is not None and cookie.http_only
    PAYLOAD.clear()
    PAYLOAD.update({'sub': 'google-sub-1', 'email': EMAIL, 'email_verified': True, 'nonce': q['nonce']})
    return q


def callback(client, q, **over):
    params = {'state': q['state'], 'code': 'abc'}
    params.update(over)
    r = client.get('/api/auth/google/callback', query_string=params)
    assert r.status_code == 302
    loc = r.headers['Location']
    frag = urlparse(loc)
    query = frag.query or (frag.fragment.split('?', 1)[1] if '?' in frag.fragment else '')
    return loc, {k: v[0] for k, v in parse_qs(query).items()}


def test_config_reports_google(client):
    assert client.get('/api/auth/config').get_json()['google'] is True


def test_success_web_then_exchange_once(client):
    q = start(client)
    loc, params = callback(client, q)
    assert loc.startswith('http://localhost:3000/#/auth-return?code=')
    r = client.post('/api/auth/google/exchange', json={'code': params['code']})
    assert r.status_code == 200 and r.get_json()['user']['email'] == EMAIL
    assert client.post('/api/auth/google/exchange', json={'code': params['code']}).status_code == 401
    conn = get_db(); sub = conn.execute("SELECT google_sub FROM users WHERE email = ?", (EMAIL,)).fetchone()[0]; conn.close()
    assert sub == 'google-sub-1'


def test_success_android_deep_link(client):
    q = start(client, 'android')
    loc, params = callback(client, q)
    assert loc.startswith('msecstudent://auth-return?code=') and params['code']


def test_bad_state(client):
    q = start(client)
    _, params = callback(client, q, state='f' * 64)
    assert params == {'error': 'google_failed'}


def test_wrong_cookie(client):
    q = start(client)
    client.set_cookie('msec_google', 'a' * 64, path='/api/auth/google')
    _, params = callback(client, q)
    assert params['error'] == 'google_failed'


def test_flow_single_use(client):
    q = start(client)
    callback(client, q)
    _, params = callback(client, q)
    assert params['error'] == 'google_failed'


def test_nonce_mismatch(client):
    q = start(client)
    PAYLOAD['nonce'] = 'other'
    _, params = callback(client, q)
    assert params['error'] == 'google_failed'


def test_email_not_verified(client):
    q = start(client)
    PAYLOAD['email_verified'] = False
    _, params = callback(client, q)
    assert params['error'] == 'google_failed'


def test_not_on_roster(client):
    q = start(client)
    PAYLOAD['email'] = 'stranger@gmail.com'
    _, params = callback(client, q)
    assert params['error'] == 'not_registered'


def test_sub_conflict(client):
    conn = get_db(); conn.execute("UPDATE users SET google_sub = 'someone-else' WHERE email = ?", (EMAIL,)); conn.commit(); conn.close()
    q = start(client)
    _, params = callback(client, q)
    assert params['error'] == 'google_conflict'


def test_user_cancelled(client):
    q = start(client)
    _, params = callback(client, q, error='access_denied', code='')
    assert params['error'] == 'google_cancelled'


def test_expired_flow(client):
    q = start(client)
    conn = get_db(); conn.execute("UPDATE google_flows SET expires_at = ?", (time.time() - 1,)); conn.commit(); conn.close()
    _, params = callback(client, q)
    assert params['error'] == 'google_failed'


def test_exchange_expires_after_60s(client):
    q = start(client)
    _, params = callback(client, q)
    conn = get_db(); conn.execute("UPDATE google_flows SET exchange_expires_at = ?", (time.time() - 1,)); conn.commit(); conn.close()
    assert client.post('/api/auth/google/exchange', json={'code': params['code']}).status_code == 401


def test_start_disabled_without_config(client, monkeypatch):
    monkeypatch.delenv('GOOGLE_CLIENT_ID')
    assert client.get('/api/auth/google/start').status_code == 503


def test_success_teacher_returns_to_teacher_app(client, monkeypatch):
    monkeypatch.setenv('TEACHER_ORIGIN', 'http://localhost:8080')
    q = start(client, 'teacher')
    loc, params = callback(client, q)
    assert loc.startswith('http://localhost:8080/#/auth-return?code=') and params['code']
