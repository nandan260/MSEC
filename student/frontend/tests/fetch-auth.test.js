import { describe, it, expect, vi, beforeEach } from 'vitest';

describe('installFetchAuth', () => {
  beforeEach(() => { vi.resetModules(); localStorage.clear(); delete window.__msecFetchAuth; });

  it('adds the bearer token to /api requests only, and a 401 ends the session', async () => {
    const calls = [];
    window.fetch = vi.fn(async (input, init) => {
      calls.push([input, new Headers(init?.headers).get('Authorization')]);
      return new Response('{}', { status: String(input).includes('expired') ? 401 : 200 });
    });
    const api = await import('../src/api.js');
    api.installFetchAuth();
    localStorage.setItem('auth_token', 'tok');
    const ended = vi.fn();
    window.addEventListener(api.UNAUTHORIZED_EVENT, ended);
    await fetch('/api/notes/upload', { method: 'POST' });
    await fetch('https://example.com/x');
    expect(calls[0][1]).toBe('Bearer tok');
    expect(calls[1][1]).toBeNull();
    await fetch('/api/expired');
    expect(ended).toHaveBeenCalledTimes(1);
    expect(localStorage.getItem('auth_token')).toBeNull();
  });

  it('a 401 from the login endpoint does not count as a session ending', async () => {
    window.fetch = vi.fn(async () => new Response('{"error":"Invalid email or password."}', { status: 401 }));
    const api = await import('../src/api.js');
    const ended = vi.fn();
    window.addEventListener(api.UNAUTHORIZED_EVENT, ended);
    localStorage.setItem('auth_token', 'tok');
    await expect(api.apiRequest('/auth/login', { method: 'POST' })).rejects.toThrow('Invalid email or password.');
    expect(ended).not.toHaveBeenCalled();
  });
});
