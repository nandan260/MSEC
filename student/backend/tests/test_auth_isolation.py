from helpers import ALEX, FACULTY, auth, make_user

B = 'bee@gmail.com'


def get(client, path, who):
    r = client.get(path, headers=auth(who))
    assert r.status_code == 200, f'{path} -> {r.status_code} {r.get_data(as_text=True)[:200]}'
    return r.get_json()


def test_alex_has_data(client):
    d = get(client, '/api/dashboard/summary', ALEX)
    assert d['student']['name'] == 'Alex Kumar'
    assert d['student']['overall_attendance'] > 0
    assert get(client, '/api/attendance', ALEX)['attendance']
    assert get(client, '/api/academics/performance', ALEX)['marks']


def test_student_b_sees_none_of_alexs_rows(client):
    make_user(B, name='Bee Student', semester=6)
    d = get(client, '/api/dashboard/summary', B)
    assert d['student']['name'] == 'Bee Student'
    assert d['student']['overall_attendance'] == 0
    assert d['student']['cgpa'] == 0
    assert get(client, '/api/attendance', B)['attendance'] == []
    assert get(client, '/api/academics/performance', B)['marks'] == []
    assert get(client, '/api/gpa/history', B)['history'] == []
    assert all(a['submission_id'] is None for a in get(client, '/api/assignments', B)['assignments'])
    assert get(client, '/api/placements/applications', B)['applications'] == []
    assert get(client, '/api/placements/resumes', B)['resumes'] == []
    assert get(client, '/api/events/my-registrations', B)['registrations'] == []
    assert get(client, '/api/library/my-books', B).get('borrowed_books', []) == []
    assert get(client, '/api/profile', B)['profile'].get('name') == 'Bee Student'
    analytics = get(client, '/api/analytics', B)
    assert analytics['student']['name'] == 'Bee Student'
    exams = get(client, '/api/examinations', B)
    assert exams['registration']['candidate_name'] == 'Bee Student'


def test_student_cannot_peek_with_params(client):
    make_user(B, name='Bee Student')
    alex_id = 1
    assert get(client, f'/api/attendance?student_id={alex_id}', B)['attendance'] == []
    assert get(client, f'/api/academics/performance?student_id={alex_id}', B)['marks'] == []
    fees = get(client, f'/api/fees/student-details?student_id={alex_id}', B)
    assert 'Alex' not in str(fees)
    tx = get(client, f'/api/fees/transactions?student_id={alex_id}', B)
    assert (tx if isinstance(tx, list) else tx.get('transactions', [])) == []


def test_resume_download_owner_only(client):
    make_user(B, name='Bee Student')
    resumes = get(client, '/api/placements/resumes', ALEX)['resumes']
    if resumes:
        rid = resumes[0]['id']
        assert client.get(f'/api/placements/resumes/{rid}/download', headers=auth(B)).status_code == 404


# Community boards that intentionally show other students' names.
SHARED_BOARDS = {'/api/projects', '/api/services/lost-found', '/api/mentor/discussions'}


def test_no_get_route_leaks_alex_to_b(app, client):
    make_user(B, name='Bee Student')
    leaks = []
    for rule in app.url_map.iter_rules():
        if not rule.rule.startswith('/api/') or rule.arguments or 'GET' not in rule.methods or rule.rule in SHARED_BOARDS:
            continue
        r = client.get(rule.rule, headers=auth(B))
        assert r.status_code < 500 or r.status_code == 503, rule.rule
        body = r.get_data(as_text=True)
        if '1MS21CS084' in body or 'Alex Kumar' in body:
            leaks.append(rule.rule)
    assert leaks == []


def test_alex_get_routes_do_not_crash(app, client):
    for rule in app.url_map.iter_rules():
        if rule.rule.startswith('/api/') and not rule.arguments and 'GET' in rule.methods:
            assert client.get(rule.rule, headers=auth(ALEX)).status_code not in (500, 502), rule.rule
