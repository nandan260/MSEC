"""Google OAuth (filled in Task 4)."""
import os


def google_enabled():
    return bool(os.environ.get('GOOGLE_CLIENT_ID') and os.environ.get('GOOGLE_CLIENT_SECRET'))
