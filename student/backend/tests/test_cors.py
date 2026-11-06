import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app import app


def test_uploads_allow_cross_origin():
    client = app.test_client()
    resp = client.options(
        '/uploads/profiles/default_student.png',
        headers={'Origin': 'https://localhost', 'Access-Control-Request-Method': 'GET'},
    )
    assert 'Access-Control-Allow-Origin' in resp.headers
