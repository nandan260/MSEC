"""Serve dashboard and proxy /api to the teacher backend on the same origin."""
import argparse
import functools
import json
import os
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen


class DashboardHandler(SimpleHTTPRequestHandler):
    backend = os.environ.get('TEACHER_BACKEND_URL', 'http://127.0.0.1:8000').rstrip('/')
    # MSEC sign-in and roster live on the Flask auth server.
    auth_backend = os.environ.get('AUTH_BACKEND_URL', 'http://127.0.0.1:5000').rstrip('/')

    def do_GET(self):
        if self.path.startswith('/api/') or self.path.startswith('/auth-api/'):
            self.proxy()
        else:
            super().do_GET()

    def do_POST(self):
        if self.path.startswith('/api/') or self.path.startswith('/auth-api/'):
            self.proxy()
        else:
            self.send_error(405)

    def proxy(self):
        try:
            length = int(self.headers.get('Content-Length', '0'))
        except ValueError:
            self.send_error(400)
            return
        if length < 0 or length > 2 * 1024 * 1024:
            self.send_error(413)
            return
        headers = {'Content-Type': self.headers.get('Content-Type', 'application/json')}
        for name in ('Authorization', 'Cookie'):
            if self.headers.get(name):
                headers[name] = self.headers[name]
        if self.path.startswith('/auth-api/'):
            target = self.auth_backend + self.path[len('/auth-api'):]
        else:
            target = self.backend + '/' + self.path[5:]
        request = Request(target,
                          data=self.rfile.read(length) if self.command == 'POST' else None,
                          headers=headers, method=self.command)
        try:
            response = urlopen(request, timeout=180)
        except HTTPError as error:
            response = error
        except (URLError, TimeoutError, OSError):
            body = json.dumps({'error': 'Teacher backend unavailable. Start teacher/backend with npm run dev.'}).encode()
            self.send_response(503)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Content-Length', str(len(body)))
            self.end_headers()
            self.wfile.write(body)
            return
        with response:
            body = response.read()
            self.send_response(response.status)
            for name in ('Content-Type', 'Content-Disposition', 'Cache-Control'):
                if response.headers.get(name):
                    self.send_header(name, response.headers[name])
            self.send_header('Content-Length', str(len(body)))
            self.end_headers()
            try:
                self.wfile.write(body)
            except (BrokenPipeError, ConnectionResetError):
                pass


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--port', type=int, default=4173)
    parser.add_argument('--host', default='127.0.0.1')
    args = parser.parse_args()
    assets = Path(__file__).resolve().parent.parent / 'dist'
    server = ThreadingHTTPServer((args.host, args.port), functools.partial(DashboardHandler, directory=str(assets)))
    print(f'Teacher Desk: http://{args.host}:{args.port}', flush=True)
    print(f'API backend: {DashboardHandler.backend}', flush=True)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        server.server_close()
