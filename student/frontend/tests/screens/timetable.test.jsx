import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup, within } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

vi.mock('../../src/api', async () => {
  class NetworkError extends Error {}
  return { apiRequest: vi.fn(), NetworkError };
});

import { apiRequest, NetworkError } from '../../src/api';
import TimetableView from '../../src/screens/TimetableScreen.jsx';

const slot = (id, day, code, title) => ({ id, day_of_week: day, start_time: '09:00 AM', end_time: '10:00 AM', course_code: code, course_title: title, room: `LH-30${id}`, faculty_name: 'Dr. Rao' });
const byDay = {
  1: [slot(1, 1, 'CS601', 'Compilers')],
  3: [slot(3, 3, 'CS603', 'Cloud')],
  4: [slot(4, 4, 'CS604', 'Security')],
};
const weekly = [slot(1, 1, 'CS601', 'Compilers'), slot(3, 3, 'CS603', 'Cloud')];

beforeEach(() => {
  apiRequest.mockReset();
  apiRequest.mockImplementation(async (url, opts) => {
    if (opts?.method) return { message: 'ok' };
    if (url.includes('view=weekly')) return { schedule: weekly };
    const d = Number(url.split('day=')[1]);
    return { schedule: byDay[d] || [] };
  });
});

const setDate = (iso) => vi.useFakeTimers({ toFake: ['Date'], now: new Date(iso) });

describe('TimetableScreen', () => {
  it('defaults to today (Wednesday 2026-11-04)', async () => {
    setDate('2026-11-04T10:00:00');
    render(<TimetableView userRole="student" />);
    expect(await screen.findByText('CS603: Cloud')).toBeInTheDocument();
    expect(apiRequest).toHaveBeenCalledWith('/timetable?view=daily&day=3');
    expect(screen.getByRole('tab', { name: 'Wed' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByText('LH-303')).toBeInTheDocument();
    expect(screen.getAllByText('Dr. Rao').length).toBe(1);
  });

  it('defaults to Monday on Sunday', async () => {
    setDate('2026-11-08T10:00:00');
    render(<TimetableView userRole="student" />);
    expect(await screen.findByText('CS601: Compilers')).toBeInTheDocument();
    expect(apiRequest).toHaveBeenCalledWith('/timetable?view=daily&day=1');
    expect(screen.getAllByRole('tab').map((t) => t.textContent)).toEqual(['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']);
  });

  it('picking a chip filters the lectures', async () => {
    setDate('2026-11-04T10:00:00');
    render(<TimetableView userRole="student" />);
    await screen.findByText('CS603: Cloud');
    fireEvent.click(screen.getByRole('tab', { name: 'Thu' }));
    expect(await screen.findByText('CS604: Security')).toBeInTheDocument();
    expect(screen.queryByText('CS603: Cloud')).toBeNull();
    fireEvent.click(screen.getByRole('tab', { name: 'Sat' }));
    expect(await screen.findByText('No classes scheduled.')).toBeInTheDocument();
  });

  it('Week view toggle shows the grid inside scroll-x', async () => {
    setDate('2026-11-04T10:00:00');
    render(<TimetableView userRole="student" />);
    await screen.findByText('CS603: Cloud');
    fireEvent.click(screen.getByRole('button', { name: 'Week view' }));
    const grid = await screen.findByRole('table');
    expect(grid.closest('.scroll-x')).not.toBeNull();
    expect(within(grid).getByText('Monday')).toBeInTheDocument();
    expect(within(grid).getByText('Wednesday')).toBeInTheDocument();
    expect(apiRequest).toHaveBeenCalledWith('/timetable?view=weekly');
    expect(screen.queryByRole('tab')).toBeNull();
    expect(screen.queryByText('+ Add Entry')).toBeNull();
  });

  it('shows ErrorCard and retries', async () => {
    setDate('2026-11-04T10:00:00');
    apiRequest.mockRejectedValueOnce(new NetworkError('down'));
    render(<TimetableView userRole="student" />);
    expect(await screen.findByText("Can't reach the server")).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
    expect(await screen.findByText('CS603: Cloud')).toBeInTheDocument();
  });

  it('admin can add and delete entries', async () => {
    setDate('2026-11-04T10:00:00');
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    render(<TimetableView userRole="admin" />);
    await screen.findByText('CS603: Cloud');
    fireEvent.click(screen.getByRole('button', { name: 'Delete' }));
    await waitFor(() => expect(apiRequest).toHaveBeenCalledWith('/timetable/3', { method: 'DELETE' }));
    fireEvent.click(screen.getByRole('button', { name: '+ Add Entry' }));
    fireEvent.click(screen.getByRole('button', { name: 'Save Timetable Entry' }));
    await waitFor(() =>
      expect(apiRequest).toHaveBeenCalledWith('/timetable', {
        method: 'POST',
        body: JSON.stringify({ day_of_week: 1, start_time: '09:00 AM', end_time: '10:00 AM', course_code: 'CS601', course_title: 'Distributed Systems', room: 'LH-302', faculty_name: 'Dr. Ramesh Rao' }),
      }),
    );
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
  });

  it('orders lectures by clock time, not text (PM after AM)', async () => {
    setDate('2026-11-04T10:00:00');
    apiRequest.mockResolvedValueOnce({
      schedule: [
        { ...slot(7, 3, 'CS607', 'Afternoon'), start_time: '02:00 PM', end_time: '04:00 PM' },
        { ...slot(8, 3, 'CS608', 'Morning'), start_time: '09:00 AM' },
      ],
    });
    render(<TimetableView userRole="student" />);
    await screen.findByText('CS608: Morning');
    const titles = screen.getAllByText(/^CS60[78]:/).map((n) => n.textContent);
    expect(titles).toEqual(['CS608: Morning', 'CS607: Afternoon']);
  });
});
