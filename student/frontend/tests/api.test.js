import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const browserOpen = vi.fn();
vi.mock('@capacitor/browser', () => ({ Browser: { open: (...a) => browserOpen(...a) } }));

async function load(base) {
  vi.resetModules();
  if (base === undefined) vi.stubEnv('VITE_API_BASE', '');
  else vi.stubEnv('VITE_API_BASE', base);
  return import('../src/api.js');
}

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  delete window.Capacitor;
  browserOpen.mockReset();
});

describe('apiUrl', () => {
  it('is relative when VITE_API_BASE is unset', async () => {
    const { apiUrl } = await load();
    expect(apiUrl('/api/x')).toBe('/api/x');
  });
  it('prefixes VITE_API_BASE', async () => {
    const { apiUrl } = await load('https://h.example');
    expect(apiUrl('/api/x')).toBe('https://h.example/api/x');
  });
  it('avoids double slash', async () => {
    const { apiUrl } = await load('https://h.example/');
    expect(apiUrl('/api/x')).toBe('https://h.example/api/x');
  });
  it('passes absolute urls through', async () => {
    const { apiUrl } = await load('https://h.example');
    expect(apiUrl('https://cdn.example/a.png')).toBe('https://cdn.example/a.png');
  });
  it('returns empty string for empty/null', async () => {
    const { apiUrl } = await load('https://h.example');
    expect(apiUrl('')).toBe('');
    expect(apiUrl(null)).toBe('');
  });
});

describe('apiRequest', () => {
  beforeEach(() => localStorage.clear());

  it('calls fetch with apiUrl(/api + endpoint)', async () => {
    const { apiRequest, apiUrl } = await load('https://h.example');
    const f = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ a: 1 }) });
    vi.stubGlobal('fetch', f);
    await expect(apiRequest('/x')).resolves.toEqual({ a: 1 });
    expect(f.mock.calls[0][0]).toBe(apiUrl('/api/x'));
    expect(f.mock.calls[0][0]).toBe('https://h.example/api/x');
  });
  it('rejects with NetworkError when fetch throws TypeError', async () => {
    const { apiRequest, NetworkError } = await load();
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')));
    const err = await apiRequest('/x').catch(e => e);
    expect(err).toBeInstanceOf(NetworkError);
  });
  it('rejects with plain Error carrying server error on 4xx/5xx', async () => {
    const { apiRequest, NetworkError } = await load();
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 400, json: async () => ({ error: 'Bad thing' }) }));
    const err = await apiRequest('/x').catch(e => e);
    expect(err).toBeInstanceOf(Error);
    expect(err).not.toBeInstanceOf(NetworkError);
    expect(err.message).toBe('Bad thing');
  });
});

describe('openExternal', () => {
  it('uses window.open when not native', async () => {
    const { openExternal, isNative } = await load();
    const open = vi.spyOn(window, 'open').mockImplementation(() => null);
    expect(isNative()).toBe(false);
    await openExternal('https://x.example/f');
    expect(open).toHaveBeenCalledWith('https://x.example/f', '_blank');
    open.mockRestore();
  });
  it('uses Capacitor Browser when native', async () => {
    const { openExternal, isNative } = await load();
    window.Capacitor = { isNativePlatform: () => true };
    expect(isNative()).toBe(true);
    await openExternal('https://x.example/f');
    expect(browserOpen).toHaveBeenCalledWith({ url: 'https://x.example/f' });
  });
});
