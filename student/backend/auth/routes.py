"""Auth blueprint: /api/auth/*."""
import os

from flask import Blueprint, g, jsonify

from database import get_db
from .users import public_user

bp = Blueprint('auth', __name__, url_prefix='/api/auth')

DEV_ORIGINS = [
    'http://localhost:3000', 'http://127.0.0.1:3000', 'http://localhost:5173', 'http://localhost:5000',
    'capacitor://localhost', 'http://localhost', 'https://localhost',
]


def cors_origins():
    extra = [o.strip().rstrip('/') for o in os.environ.get('PUBLIC_ORIGIN', '').split(',') if o.strip()]
    return extra + DEV_ORIGINS


@bp.get('/me')
def me():
    conn = get_db()
    row = conn.execute("SELECT * FROM users WHERE id = ?", (g.user['id'],)).fetchone()
    user = public_user(conn, row)
    conn.close()
    return jsonify({'user': user})


@bp.post('/logout-all')
def logout_all():
    conn = get_db()
    conn.execute("UPDATE users SET token_version = token_version + 1 WHERE id = ?", (g.user['id'],))
    conn.commit()
    conn.close()
    return jsonify({'message': 'Signed out on every device.'})
