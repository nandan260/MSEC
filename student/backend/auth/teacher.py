"""Teacher view of students, limited to assigned branch+semester classes."""
from flask import Blueprint, g, jsonify, request

from database import get_db
from .users import classes_for, staff_can_access_student

bp = Blueprint('teacher', __name__, url_prefix='/api/teacher')


def _attendance_pct(conn, uid):
    row = conn.execute("SELECT SUM(attended_hours) a, SUM(od_hours) od, SUM(total_hours) t FROM attendance WHERE user_id = ?", (uid,)).fetchone()
    return round(((row['a'] or 0) + (row['od'] or 0)) / row['t'] * 100, 1) if row and row['t'] else 0.0


@bp.get('/classes')
def classes():
    conn = get_db()
    try:
        if g.user['role'] == 'admin':
            rows = conn.execute("SELECT DISTINCT department, semester FROM users WHERE role = 'student' AND active = 1 ORDER BY department, semester").fetchall()
            return jsonify({'classes': [{'department': r['department'], 'semester': r['semester']} for r in rows]})
        return jsonify({'classes': classes_for(conn, g.user['id'])})
    finally:
        conn.close()


@bp.get('/students')
def students():
    department = (request.args.get('department') or '').strip()
    try:
        semester = int(request.args.get('semester', ''))
    except ValueError:
        return jsonify({'error': 'Choose a class.'}), 400
    conn = get_db()
    try:
        if g.user['role'] != 'admin':
            mine = {(c['department'], c['semester']) for c in classes_for(conn, g.user['id'])}
            if (department, semester) not in mine:
                return jsonify({'error': "You don't have access."}), 403
        rows = conn.execute(
            """SELECT u.id, u.name, u.email, u.identifier AS usn, u.department, u.semester, p.cgpa
               FROM users u LEFT JOIN student_profiles p ON p.user_id = u.id
               WHERE u.role = 'student' AND u.active = 1 AND u.department = ? AND u.semester = ?
               ORDER BY u.identifier, u.name""",
            (department, semester),
        ).fetchall()
        out = []
        for r in rows:
            item = dict(r)
            item['attendance'] = _attendance_pct(conn, r['id'])
            out.append(item)
        return jsonify({'department': department, 'semester': semester, 'students': out})
    finally:
        conn.close()


@bp.get('/students/<int:student_id>')
def student_detail(student_id):
    conn = get_db()
    try:
        row = conn.execute("SELECT id, name, email, identifier AS usn, department, semester FROM users WHERE id = ? AND role = 'student'", (student_id,)).fetchone()
        if not row or not staff_can_access_student(conn, student_id):
            return jsonify({'error': "You don't have access."}), 403
        attendance = [dict(r) for r in conn.execute(
            "SELECT course_code, course_title, attended_hours, total_hours, od_hours FROM attendance WHERE user_id = ? ORDER BY course_code", (student_id,))]
        marks = [dict(r) for r in conn.execute(
            "SELECT semester, course_code, course_title, credits, total_marks, grade, status FROM academic_marks WHERE user_id = ? ORDER BY semester DESC, course_code", (student_id,))]
        return jsonify({'student': dict(row), 'attendance_percentage': _attendance_pct(conn, student_id), 'attendance': attendance, 'marks': marks})
    finally:
        conn.close()
