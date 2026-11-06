import { afterEach, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import DashboardScreen from '../src/screens/DashboardScreen';

afterEach(() => { cleanup(); localStorage.clear(); vi.restoreAllMocks(); });

it('labels fallback records with their actual saved date even when browser reports online', async () => {
  localStorage.clear();
  const summary = { student: { name: 'Alex', overall_attendance: 89, current_sgpa: 9.6, cgpa: 9.4 }, upcoming_examinations: [], pending_assignments: [], recent_announcements: [] };
  const fetch = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({ ok: true, json: async () => summary });
  const first = render(<DashboardScreen />);
  await screen.findByRole('region', { name: 'Student summary for Alex' });
  first.unmount();
  fetch.mockRejectedValue(new TypeError('server unreachable'));
  render(<DashboardScreen />);
  await screen.findByRole('region', { name: 'Student summary for Alex' });
  expect(await screen.findByRole('status')).toHaveTextContent('Saved records');
  expect(screen.getByRole('status').textContent).toMatch(/\d/);
});
