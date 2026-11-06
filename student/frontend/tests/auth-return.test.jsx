import { describe, it, expect, vi, afterEach } from 'vitest';
import { renderHook, cleanup, waitFor } from '@testing-library/react';

const listeners = {};
vi.mock('@capacitor/app', () => ({
  App: {
    getLaunchUrl: vi.fn().mockResolvedValue({ url: 'msecstudent://auth-return?code=' + 'b'.repeat(64) }),
    addListener: vi.fn(async (name, fn) => { listeners[name] = fn; return { remove: vi.fn() }; }),
  },
}));
vi.mock('@capacitor/browser', () => ({ Browser: { close: vi.fn().mockResolvedValue() } }));
vi.mock('../src/api', async () => ({ ...(await vi.importActual('../src/api')), isNative: () => true }));

import { useAuthReturn } from '../src/useAuthReturn';
import { parseAuthReturn } from '../src/auth-api';

afterEach(cleanup);

describe('auth return', () => {
  it('parses web and android return URLs', () => {
    expect(parseAuthReturn('#/auth-return?code=abc')).toEqual({ code: 'abc' });
    expect(parseAuthReturn('msecstudent://auth-return?error=google_cancelled')).toEqual({ error: 'google_cancelled' });
    expect(parseAuthReturn('#/home')).toBeNull();
  });

  it('handles appUrlOpen and launch url', async () => {
    const onReturn = vi.fn();
    renderHook(() => useAuthReturn(onReturn));
    await waitFor(() => expect(onReturn).toHaveBeenCalledWith({ code: 'b'.repeat(64) }));
    await waitFor(() => expect(listeners.appUrlOpen).toBeTypeOf('function'));
    await listeners.appUrlOpen({ url: 'msecstudent://auth-return?code=' + 'c'.repeat(64) });
    await waitFor(() => expect(onReturn).toHaveBeenCalledWith({ code: 'c'.repeat(64) }));
  });
});
