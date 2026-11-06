"""Launch teacher backend using an explicit model config or existing Hermes Ollama credentials.

Credentials remain in child process environment; this script never copies or logs them.
"""
import argparse
import os
from pathlib import Path
import shutil
import sys


def dotenv_value(path, name):
    if not path.is_file():
        return ''
    for line in path.read_text().splitlines():
        stripped = line.strip()
        if stripped.startswith('export '):
            stripped = stripped[7:]
        if not stripped or stripped.startswith('#') or '=' not in stripped:
            continue
        key, value = stripped.split('=', 1)
        if key.strip() == name:
            value = value.strip()
            if len(value) > 1 and value[0] == value[-1] and value[0] in ('"', "'"):
                return value[1:-1]
            return value.split(' #', 1)[0].strip()
    return ''


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--hermes', action='store_true', help='Use existing Hermes Ollama Cloud API key')
    parser.add_argument('--model', default=os.environ.get('AI_MODEL') or 'gpt-oss:120b')
    parser.add_argument('--port', type=int, default=int(os.environ.get('PORT', '8000')))
    args = parser.parse_args()
    env = os.environ.copy()
    if args.hermes:
        key = env.get('OLLAMA_API_KEY') or dotenv_value(Path.home() / '.hermes' / '.env', 'OLLAMA_API_KEY')
        if not key:
            sys.exit('Hermes Ollama Cloud key unavailable. Configure teacher/backend/.env instead.')
        env.update(AI_BASE_URL='https://ollama.com/v1', AI_MODEL=args.model, AI_API_KEY=key)
        print(f'Using Hermes Ollama Cloud connection; model {args.model}. Credentials stay server-side.', flush=True)
    env['PORT'] = str(args.port)
    backend = Path(__file__).resolve().parent.parent / 'backend'
    if not (backend / 'dist/index.js').is_file():
        sys.exit('Build backend first: cd teacher/backend && npm install && npm run build')
    node = shutil.which('node')
    if not node:
        sys.exit('Node.js is required.')
    os.chdir(backend)
    os.execve(node, [node, '--env-file-if-exists=.env', 'dist/index.js'], env)
