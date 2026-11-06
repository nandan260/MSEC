import os
import sys
import tempfile

# Isolate every test run from the real database and uploads. Must run before importing app.
_TMP = tempfile.mkdtemp(prefix='msec-test-')
os.environ.setdefault('STUDENT_DB_PATH', os.path.join(_TMP, 'test.db'))
os.environ.setdefault('STUDENT_UPLOAD_DIR', os.path.join(_TMP, 'uploads'))
os.environ.setdefault('AUTH_SECRET', 'test-secret-please-change-0123456789abcdef')
os.environ.setdefault('ALLOWED_EMAIL_DOMAINS', 'gmail.com,college.edu')
os.environ.setdefault('PUBLIC_ORIGIN', 'http://localhost:3000')

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import pytest  # noqa: E402


@pytest.fixture()
def app():
    from app import app as flask_app
    flask_app.config['TESTING'] = True
    return flask_app


@pytest.fixture()
def client(app):
    return app.test_client()
