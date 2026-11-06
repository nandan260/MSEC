from database import get_db
from helpers import ADMIN, ALEX, FACULTY, auth, make_user

CSE = 'Computer Science & Engineering'


def assign(email, department, semester):
    conn = get_db()
    uid = conn.execute("SELECT id FROM users WHERE email = ?", (email,)).fetchone()[0]
    conn.execute("INSERT OR IGNORE INTO teacher_classes (user_id, department, semester) VALUES (?,?,?)", (uid, department, semester))
    conn.commit(); conn.close()


# ---------- teacher ----------

def test_teacher_classes_and_students(client):
    t = 'teach@gmail.com'; make_user(t, role='faculty', name='Teach')
    assign(t, CSE, 6)
    r = client.get('/api/teacher/classes', headers=auth(t))
    assert r.status_code == 200 and r.get_json()['classes'] == [{'department': CSE, 'semester': 6}]
    r = client.get('/api/teacher/students', query_string={'department': CSE, 'semester': 6}, headers=auth(t))
    assert r.status_code == 200
    names = [s['name'] for s in r.get_json()['students']]
    assert 'Alex Kumar' in names
    alex = next(s for s in r.get_json()['students'] if s['name'] == 'Alex Kumar')
    assert alex['attendance'] > 0


def test_teacher_403_outside_class(client):
    t = 'teach2@gmail.com'; make_user(t, role='faculty', name='Teach2')
    assign(t, 'Mechanical', 4)
    r = client.get('/api/teacher/students', query_string={'department': CSE, 'semester': 6}, headers=auth(t))
    assert r.status_code == 403
    assert client.get('/api/teacher/students/1', headers=auth(t)).status_code == 403
    # data routes with ?student_id= also respect class scope
    assert client.get('/api/attendance?student_id=1', headers=auth(t)).status_code == 403


def test_teacher_student_detail(client):
    t = 'teach3@gmail.com'; make_user(t, role='faculty', name='Teach3')
    assign(t, CSE, 6)
    r = client.get('/api/teacher/students/1', headers=auth(t))
    assert r.status_code == 200
    d = r.get_json()
    assert d['student']['name'] == 'Alex Kumar' and d['attendance'] and d['marks']


def test_students_cannot_use_teacher_routes(client):
    assert client.get('/api/teacher/classes', headers=auth(ALEX)).status_code == 403


def test_admin_sees_any_class(client):
    r = client.get('/api/teacher/students', query_string={'department': CSE, 'semester': 6}, headers=auth(ADMIN))
    assert r.status_code == 200


# ---------- admin roster ----------

def test_roster_list_and_filters(client):
    r = client.get('/api/admin/roster', headers=auth(ADMIN))
    assert r.status_code == 200
    users = r.get_json()['users']
    assert any(u['email'] == ALEX for u in users)
    r = client.get('/api/admin/roster', query_string={'role': 'faculty'}, headers=auth(ADMIN))
    assert all(u['role'] == 'faculty' for u in r.get_json()['users'])
    r = client.get('/api/admin/roster', query_string={'q': 'alex'}, headers=auth(ADMIN))
    assert [u['email'] for u in r.get_json()['users']] == [ALEX]


def test_roster_requires_admin(client):
    assert client.get('/api/admin/roster', headers=auth(ALEX)).status_code == 403
    assert client.get('/api/admin/roster', headers=auth(FACULTY)).status_code == 403


def test_create_student_and_teacher(client):
    h = auth(ADMIN)
    r = client.post('/api/admin/roster', json={'email': 'New.Kid@gmail.com', 'name': 'New Kid', 'usn': '1ME23CS200', 'role': 'student', 'branch': 'CSE', 'sem': 3}, headers=h)
    assert r.status_code == 201, r.get_json()
    u = r.get_json()['user']
    assert u['email'] == 'new.kid@gmail.com' and u['department'] == 'CSE' and u['semester'] == 3
    conn = get_db(); prof = conn.execute("SELECT * FROM student_profiles WHERE user_id = ?", (u['id'],)).fetchone(); conn.close()
    assert prof and prof['usn'] == '1ME23CS200'
    r = client.post('/api/admin/roster', json={'email': 'prof.x@gmail.com', 'name': 'Prof X', 'usn': 'EMP9', 'role': 'faculty', 'classes': 'CSE-3;CSE-5'}, headers=h)
    assert r.status_code == 201
    assert r.get_json()['user']['classes'] == [{'department': 'CSE', 'semester': 3}, {'department': 'CSE', 'semester': 5}]
    assert client.post('/api/admin/roster', json={'email': 'new.kid@gmail.com', 'name': 'Dup', 'usn': 'X', 'role': 'student', 'branch': 'CSE', 'sem': 3}, headers=h).status_code == 409


def test_create_validation(client):
    h = auth(ADMIN)
    assert client.post('/api/admin/roster', json={'email': 'bad@yahoo.com', 'name': 'B', 'usn': 'U', 'role': 'student', 'branch': 'CSE', 'sem': 1}, headers=h).status_code == 400
    assert client.post('/api/admin/roster', json={'email': 'nosem@gmail.com', 'name': 'B', 'usn': 'U', 'role': 'student', 'branch': 'CSE'}, headers=h).status_code == 400
    assert client.post('/api/admin/roster', json={'email': 'role@gmail.com', 'name': 'B', 'usn': 'U', 'role': 'root'}, headers=h).status_code == 400


def test_patch_disable_classes_logout(client):
    h = auth(ADMIN)
    email = 'patchme@gmail.com'; row = make_user(email, role='faculty', name='Patch')
    target = auth(email)
    r = client.patch(f"/api/admin/roster/{row['id']}", json={'classes': [{'department': 'CSE', 'semester': 7}], 'name': 'Patched'}, headers=h)
    assert r.status_code == 200 and r.get_json()['user']['name'] == 'Patched'
    assert r.get_json()['user']['classes'] == [{'department': 'CSE', 'semester': 7}]
    assert client.patch(f"/api/admin/roster/{row['id']}", json={'logout_all': True}, headers=h).status_code == 200
    assert client.get('/api/auth/me', headers=target).status_code == 401
    fresh = auth(email)
    assert client.patch(f"/api/admin/roster/{row['id']}", json={'active': False}, headers=h).status_code == 200
    assert client.get('/api/auth/me', headers=fresh).status_code == 401


def test_admin_cannot_disable_self(client):
    conn = get_db(); aid = conn.execute("SELECT id FROM users WHERE email = ?", (ADMIN,)).fetchone()[0]; conn.close()
    assert client.patch(f'/api/admin/roster/{aid}', json={'active': False}, headers=auth(ADMIN)).status_code == 400


CSV = """email,name,usn,role,branch,sem,classes
csv1@gmail.com,Csv One,1ME23CS301,student,CSE,5,
csv2@gmail.com,Csv Two,1ME23CS302,student,CSE,5,
csvt@gmail.com,Csv Teacher,EMP301,faculty,CSE,,CSE-5;CSE-3
bad@yahoo.com,Bad Domain,1ME23CS303,student,CSE,5,
nosem@gmail.com,No Sem,1ME23CS304,student,CSE,,
"""


def test_csv_import_dry_run_then_commit(client):
    h = auth(ADMIN)
    r = client.post('/api/admin/roster/import', json={'csv': CSV, 'dry_run': True}, headers=h)
    assert r.status_code == 200
    d = r.get_json()
    assert d['created'] == 3 and d['updated'] == 0
    assert [e['row'] for e in d['errors']] == [5, 6]
    conn = get_db(); n = conn.execute("SELECT COUNT(*) FROM users WHERE email LIKE 'csv%'").fetchone()[0]; conn.close()
    assert n == 0
    r = client.post('/api/admin/roster/import', json={'csv': CSV}, headers=h)
    assert r.get_json()['created'] == 3
    again = CSV.replace('Csv One', 'Csv Uno')
    r = client.post('/api/admin/roster/import', json={'csv': again}, headers=h)
    assert r.get_json()['created'] == 0 and r.get_json()['updated'] == 3
    conn = get_db()
    assert conn.execute("SELECT name FROM users WHERE email = 'csv1@gmail.com'").fetchone()[0] == 'Csv Uno'
    t = conn.execute("SELECT id FROM users WHERE email = 'csvt@gmail.com'").fetchone()[0]
    assert conn.execute("SELECT COUNT(*) FROM teacher_classes WHERE user_id = ?", (t,)).fetchone()[0] == 2
    conn.close()


def test_csv_import_multipart(client):
    import io
    r = client.post('/api/admin/roster/import', data={'file': (io.BytesIO(CSV.encode()), 'roster.csv'), 'dry_run': '1'},
                    headers=auth(ADMIN), content_type='multipart/form-data')
    assert r.status_code == 200 and r.get_json()['created'] >= 0


def test_csv_missing_columns(client):
    r = client.post('/api/admin/roster/import', json={'csv': 'email,name\nx@gmail.com,X\n'}, headers=auth(ADMIN))
    assert r.status_code == 400
