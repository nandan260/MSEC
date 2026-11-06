import time

import pytest

from database import get_db
from helpers import ALEX, auth, make_user

SENT = []


@pytest.fixture(autouse=True)
def capture_codes(monkeypatch):
    SENT.clear()
    import auth.email as mail
    monkeypatch.setattr(mail, 'email_enabled', lambda: True)
    monkeypatch.setattr(mail, 'send_code', lambda email, name, code, purpose: SENT.append((email, code, purpose)))
    conn = get_db(); conn.execute("DELETE FROM login_attempts"); conn.execute("DELETE FROM email_codes"); conn.commit(); conn.close()
    yield


def set_password(email, pw):
    from werkzeug.security import generate_password_hash
    conn = get_db(); conn.execute("UPDATE users SET password_hash = ? WHERE email = ?", (generate_password_hash(pw), email)); conn.commit(); conn.close()


def last_code(email):
    return [c for e, c, _ in SENT if e == email][-1]


# ---------- config ----------

def test_config_public(client):
    r = client.get('/api/auth/config')
    assert r.status_code == 200
    assert set(r.get_json()) == {'google', 'email'}


# ---------- password login ----------

def test_password_login_success(client):
    email = 'pw@gmail.com'; make_user(email); set_password(email, 'correct-horse')
    r = client.post('/api/auth/login', json={'email': 'PW@gmail.com ', 'password': 'correct-horse'})
    assert r.status_code == 200
    body = r.get_json()
    assert body['user']['email'] == email and body['user']['has_password'] is True
    assert client.get('/api/auth/me', headers={'Authorization': f"Bearer {body['token']}"}).status_code == 200


def test_password_login_generic_401(client):
    email = 'pw2@gmail.com'; make_user(email); set_password(email, 'correct-horse')
    wrong = client.post('/api/auth/login', json={'email': email, 'password': 'nope-nope'})
    unknown = client.post('/api/auth/login', json={'email': 'ghost@gmail.com', 'password': 'nope-nope'})
    assert wrong.status_code == unknown.status_code == 401
    assert wrong.get_json() == unknown.get_json() == {'error': 'Invalid email or password.'}


def test_wrong_domain_rejected(client, monkeypatch):
    monkeypatch.setenv('ALLOWED_EMAIL_DOMAINS', 'gmail.com')
    set_password(ALEX, 'student123')
    assert client.post('/api/auth/login', json={'email': ALEX, 'password': 'student123'}).status_code == 401


def test_no_password_409(client):
    email = 'nopw@gmail.com'; make_user(email)
    r = client.post('/api/auth/login', json={'email': email, 'password': 'whatever1'})
    assert r.status_code == 409 and r.get_json()['code'] == 'no_password'


def test_lockout_after_5_failures(client):
    email = 'lock@gmail.com'; make_user(email); set_password(email, 'correct-horse')
    for _ in range(5):
        assert client.post('/api/auth/login', json={'email': email, 'password': 'bad-bad-bad'}).status_code == 401
    r = client.post('/api/auth/login', json={'email': email, 'password': 'correct-horse'})
    assert r.status_code == 429
    assert 'Try again in' in r.get_json()['error']


def test_disabled_user_cannot_login(client):
    email = 'dis@gmail.com'; make_user(email); set_password(email, 'correct-horse')
    conn = get_db(); conn.execute("UPDATE users SET active = 0 WHERE email = ?", (email,)); conn.commit(); conn.close()
    assert client.post('/api/auth/login', json={'email': email, 'password': 'correct-horse'}).status_code == 401


def test_register_removed(client):
    assert client.post('/api/auth/register', json={'email': 'x@gmail.com'}).status_code in (401, 404, 405)


# ---------- email code ----------

MSG = {'message': 'If this email is registered, a code was sent.'}


def test_code_request_same_response_for_unknown(client):
    email = 'code@gmail.com'; make_user(email)
    a = client.post('/api/auth/code/request', json={'email': email})
    b = client.post('/api/auth/code/request', json={'email': 'nobody@gmail.com'})
    assert a.status_code == b.status_code == 200
    assert a.get_json() == b.get_json() == MSG
    assert [e for e, _, _ in SENT] == [email]
    assert len(last_code(email)) == 6 and last_code(email).isdigit()


def test_code_request_rate_limited_per_email(client):
    email = 'rl@gmail.com'; make_user(email)
    assert client.post('/api/auth/code/request', json={'email': email}).status_code == 200
    assert client.post('/api/auth/code/request', json={'email': email}).status_code == 429


def test_code_request_rate_limited_per_ip(client):
    for i in range(10):
        assert client.post('/api/auth/code/request', json={'email': f'ip{i}@gmail.com'}).status_code == 200
    assert client.post('/api/auth/code/request', json={'email': 'ip-last@gmail.com'}).status_code == 429


def test_code_verify_success_and_single_use(client):
    email = 'ver@gmail.com'; make_user(email)
    client.post('/api/auth/code/request', json={'email': email})
    code = last_code(email)
    r = client.post('/api/auth/code/verify', json={'email': email, 'code': code})
    assert r.status_code == 200 and r.get_json()['token']
    again = client.post('/api/auth/code/verify', json={'email': email, 'code': code})
    assert again.status_code == 401


def test_otp_single_use_under_double_submit(client):
    email = 'dbl@gmail.com'; make_user(email)
    client.post('/api/auth/code/request', json={'email': email})
    code = last_code(email)
    from auth import otp
    conn1, conn2 = get_db(), get_db()
    results = [otp.verify_code(conn1, email, 'login', code), otp.verify_code(conn2, email, 'login', code)]
    assert sorted(results) == ['invalid', 'ok']


def test_code_wrong_5_times_then_dead(client):
    email = 'wrong@gmail.com'; make_user(email)
    client.post('/api/auth/code/request', json={'email': email})
    code = last_code(email)
    bad = '000000' if code != '000000' else '111111'
    for _ in range(4):
        assert client.post('/api/auth/code/verify', json={'email': email, 'code': bad}).status_code == 401
    assert client.post('/api/auth/code/verify', json={'email': email, 'code': bad}).status_code == 429
    assert client.post('/api/auth/code/verify', json={'email': email, 'code': code}).status_code in (401, 429)


def test_code_expires(client):
    email = 'exp@gmail.com'; make_user(email)
    client.post('/api/auth/code/request', json={'email': email})
    conn = get_db(); conn.execute("UPDATE email_codes SET expires_at = ? WHERE email = ?", (time.time() - 1, email)); conn.commit(); conn.close()
    assert client.post('/api/auth/code/verify', json={'email': email, 'code': last_code(email)}).status_code == 401


# ---------- passwords ----------

def test_set_then_change_password(client):
    email = 'setpw@gmail.com'; make_user(email)
    h = auth(email)
    assert client.post('/api/auth/password', json={'new_password': 'short'}, headers=h).status_code == 400
    assert client.post('/api/auth/password', json={'new_password': 'first-pass-1'}, headers=h).status_code == 200
    assert client.post('/api/auth/password', json={'new_password': 'second-pass-2'}, headers=h).status_code == 400
    assert client.post('/api/auth/password', json={'current_password': 'wrong-wrong', 'new_password': 'second-pass-2'}, headers=h).status_code == 401
    assert client.post('/api/auth/password', json={'current_password': 'first-pass-1', 'new_password': 'second-pass-2'}, headers=h).status_code == 200
    assert client.post('/api/auth/login', json={'email': email, 'password': 'second-pass-2'}).status_code == 200


def test_reset_password_logs_out_other_sessions(client):
    email = 'reset@gmail.com'; make_user(email); set_password(email, 'old-password')
    old = auth(email)
    client.post('/api/auth/code/request', json={'email': email, 'purpose': 'reset'})
    code = last_code(email)
    assert [p for e, _, p in SENT if e == email][-1] == 'reset'
    r = client.post('/api/auth/password/reset', json={'email': email, 'code': code, 'new_password': 'brand-new-pass'})
    assert r.status_code == 200 and r.get_json()['token']
    assert client.get('/api/auth/me', headers=old).status_code == 401
    assert client.post('/api/auth/login', json={'email': email, 'password': 'brand-new-pass'}).status_code == 200


def test_login_code_cannot_reset_password(client):
    email = 'mix@gmail.com'; make_user(email)
    client.post('/api/auth/code/request', json={'email': email})
    r = client.post('/api/auth/password/reset', json={'email': email, 'code': last_code(email), 'new_password': 'brand-new-pass'})
    assert r.status_code == 401


def test_logout_all(client):
    email = 'out@gmail.com'; make_user(email)
    h = auth(email)
    assert client.post('/api/auth/logout-all', headers=h).status_code == 200
    assert client.get('/api/auth/me', headers=h).status_code == 401


def test_remember_extends_expiry(client):
    import jwt
    email = 'rem@gmail.com'; make_user(email); set_password(email, 'correct-horse')
    short = client.post('/api/auth/login', json={'email': email, 'password': 'correct-horse'}).get_json()['token']
    conn = get_db(); conn.execute("DELETE FROM login_attempts"); conn.commit(); conn.close()
    long = client.post('/api/auth/login', json={'email': email, 'password': 'correct-horse', 'remember': True}).get_json()['token']
    d = lambda t: jwt.decode(t, options={'verify_signature': False})
    assert round((d(short)['exp'] - d(short)['iat']) / 86400) == 7
    assert round((d(long)['exp'] - d(long)['iat']) / 86400) == 30
