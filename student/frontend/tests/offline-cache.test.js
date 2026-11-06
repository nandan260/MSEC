import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { apiRequest, clearAuth, setUser } from '../src/api';
import { latestSavedResponse } from '../src/offline-cache';

beforeEach(() => localStorage.clear());
afterEach(() => vi.restoreAllMocks());

it('reuses successful attendance data during network failure, isolated by student', async () => {
  setUser({ identifier: 'student-a' });
  const fetch = vi.spyOn(globalThis, 'fetch');
  fetch.mockResolvedValueOnce({ ok: true, json: async () => ({ attendance: [{ id: 1 }] }) });
  await apiRequest('/attendance');
  fetch.mockRejectedValue(new TypeError('offline'));
  expect(await apiRequest('/attendance')).toEqual({ attendance: [{ id: 1 }] });
  setUser({ identifier: 'student-b' });
  await expect(apiRequest('/attendance')).rejects.toThrow();
  setUser({ identifier: 'student-a' });
  clearAuth();
  setUser({ identifier: 'student-a' });
  await expect(apiRequest('/attendance')).rejects.toThrow();
});

it('keeps day/semester responses separate and invalidates saved records after mutations', async () => {
  const fetch = vi.spyOn(globalThis, 'fetch');
  fetch.mockResolvedValueOnce({ ok: true, json: async () => ({ schedule: ['Monday'] }) });
  await apiRequest('/timetable?view=daily&day=1');
  fetch.mockRejectedValueOnce(new TypeError('offline'));
  await expect(apiRequest('/timetable?view=daily&day=2')).rejects.toThrow();
  fetch.mockResolvedValueOnce({ ok: true, json: async () => ({ ok: true }) });
  await apiRequest('/timetable/1', { method: 'PUT', body: '{}' });
  fetch.mockRejectedValueOnce(new TypeError('offline'));
  await expect(apiRequest('/timetable?view=daily&day=1')).rejects.toThrow();
});

it('does not hide server errors behind saved data or replay offline submissions', async () => {
  const fetch = vi.spyOn(globalThis, 'fetch');
  fetch.mockResolvedValueOnce({ ok: true, json: async () => ({ attendance: [] }) });
  await apiRequest('/attendance');
  fetch.mockResolvedValueOnce({ ok: false, status: 500, json: async () => ({ error: 'Server failed' }) });
  await expect(apiRequest('/attendance')).rejects.toThrow('Server failed');
  fetch.mockRejectedValueOnce(new TypeError('offline'));
  await expect(apiRequest('/assignments/1/submit', { method: 'POST' })).rejects.toThrow();
});

it('does not save a response that finishes after logout', async () => {
  setUser({ identifier: 'student-a' });
  let finish;
  const fetch = vi.spyOn(globalThis, 'fetch').mockImplementationOnce(() => new Promise((resolve) => { finish = resolve; }));
  const pending = apiRequest('/attendance');
  clearAuth();
  finish({ ok: true, json: async () => ({ attendance: [{ id: 'private' }] }) });
  await pending;
  fetch.mockRejectedValueOnce(new TypeError('offline'));
  await expect(apiRequest('/attendance')).rejects.toThrow();
});

it('restores the selected view when an older day request finishes after the weekly request', async () => {
  const clock = vi.spyOn(Date, 'now').mockReturnValue(1000);
  let finishDay, finishWeek;
  vi.spyOn(globalThis, 'fetch')
    .mockImplementationOnce(() => new Promise((resolve) => { finishDay = resolve; }))
    .mockImplementationOnce(() => new Promise((resolve) => { finishWeek = resolve; }));
  const day = apiRequest('/timetable?view=daily&day=4');
  const week = apiRequest('/timetable?view=weekly');
  finishWeek({ ok: true, json: async () => ({ schedule: ['week'] }) });
  await week;
  clock.mockReturnValue(2000);
  finishDay({ ok: true, json: async () => ({ schedule: ['day'] }) });
  await day;
  expect(latestSavedResponse('/timetable').endpoint).toBe('/timetable?view=weekly');
});
