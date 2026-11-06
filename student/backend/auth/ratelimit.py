"""Fixed-window counters stored in login_attempts."""
import math
import time


def _row(conn, key, window, now):
    row = conn.execute("SELECT window_start, count FROM login_attempts WHERE key = ?", (key,)).fetchone()
    if not row or now - row['window_start'] >= window:
        return now, 0
    return row['window_start'], row['count']


def blocked(conn, key, limit, window, now=None):
    """Seconds until the key may try again, or 0."""
    now = now or time.time()
    start, count = _row(conn, key, window, now)
    return max(1, math.ceil(start + window - now)) if count >= limit else 0


def hit(conn, key, window, now=None):
    now = now or time.time()
    start, count = _row(conn, key, window, now)
    conn.execute(
        "INSERT INTO login_attempts (key, window_start, count) VALUES (?, ?, ?) "
        "ON CONFLICT(key) DO UPDATE SET window_start = excluded.window_start, count = excluded.count",
        (key, start, count + 1),
    )
    conn.commit()


def clear(conn, key):
    conn.execute("DELETE FROM login_attempts WHERE key = ?", (key,))
    conn.commit()


def minutes(seconds):
    return max(1, math.ceil(seconds / 60))
