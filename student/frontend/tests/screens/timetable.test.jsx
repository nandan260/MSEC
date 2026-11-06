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
    expect(screen.getByRole('button', { name: 'Wed' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByText('LH-303')).toBeInTheDocument();
    expect(screen.getAllByText('Dr. Rao').length).toBe(1);
  });

  it('defaults to Monday on Sunday', async () => {
    setDate('2026-11-08T10:00:00');
    render(<TimetableView userRole="student" />);
    expect(await screen.findByText('CS601: Compilers')).toBeInTheDocument();
    expect(apiRequest).toHaveBeenCalledWith('/timetable?view=daily&day=1');
    expect(screen.getAllByRole('button', { name: /^(Mon|Tue|Wed|Thu|Fri|Sat)$/ }).map((t) => t.textContent)).toEqual(['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']);
  });

  it('picking a chip filters the lectures', async () => {
    setDate('2026-11-04T10:00:00');
    render(<TimetableView userRole="student" />);
    await screen.findByText('CS603: Cloud');
    fireEvent.click(screen.getByRole('button', { name: 'Thu' }));
    expect(await screen.findByText('CS604: Security')).toBeInTheDocument();
    expect(screen.queryByText('CS603: Cloud')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Sat' }));
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
    expect(screen.queryByRole('button', { name: 'Mon' })).toBeNull();
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

  it('defaults to Saturday and marks the Sat chip active, scrolling it into view', async () => {
    setDate('2026-11-07T10:00:00');
    const spy = vi.fn();
    Element.prototype.scrollIntoView = spy;
    render(<TimetableView userRole="student" />);
    expect(await screen.findByText('No classes scheduled.')).toBeInTheDocument();
    expect(apiRequest).toHaveBeenCalledWith('/timetable?view=daily&day=6');
    expect(screen.getByRole('button', { name: 'Sat' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'Mon' })).toHaveAttribute('aria-pressed', 'false');
    expect(spy).toHaveBeenCalledWith({ inline: 'center', block: 'nearest' });
    delete Element.prototype.scrollIntoView;
  });

  it('ignores out-of-order responses: only the last day shows', async () => {
    setDate('2026-11-04T10:00:00');
    const pending = {};
    apiRequest.mockImplementation((url) => new Promise((resolve) => { pending[url] = resolve; }));
    render(<TimetableView userRole="student" />);
    fireEvent.click(screen.getByRole('button', { name: 'Thu' }));
    fireEvent.click(screen.getByRole('button', { name: 'Fri' }));
    pending['/timetable?view=daily&day=5']({ schedule: [slot(5, 5, 'CS605', 'Friday Class')] });
    expect(await screen.findByText('CS605: Friday Class')).toBeInTheDocument();
    pending['/timetable?view=daily&day=4']({ schedule: [slot(4, 4, 'CS604', 'Security')] });
    pending['/timetable?view=daily&day=3']({ schedule: [slot(3, 3, 'CS603', 'Cloud')] });
    await Promise.resolve();
    await Promise.resolve();
    expect(screen.queryByText('CS604: Security')).toBeNull();
    expect(screen.queryByText('CS603: Cloud')).toBeNull();
    expect(screen.getByText('CS605: Friday Class')).toBeInTheDocument();
  });

  it('sorts 24-hour times without AM/PM correctly', async () => {
    setDate('2026-11-04T10:00:00');
    apiRequest.mockResolvedValueOnce({
      schedule: [
        { ...slot(7, 3, 'CS607', 'Late'), start_time: '14:00', end_time: '15:00' },
        { ...slot(8, 3, 'CS608', 'Early'), start_time: '09:00', end_time: '10:00' },
        { ...slot(9, 3, 'CS609', 'Noon'), start_time: '12:30', end_time: '13:30' },
      ],
    });
    render(<TimetableView userRole="student" />);
    await screen.findByText('CS608: Early');
    expect(screen.getAllByText(/^CS60[789]:/).map((n) => n.textContent)).toEqual(['CS608: Early', 'CS609: Noon', 'CS607: Late']);
  });

  it('Escape closes the dialog and focus starts in the first field', async () => {
    setDate('2026-11-04T10:00:00');
    render(<TimetableView userRole="admin" />);
    await screen.findByText('CS603: Cloud');
    fireEvent.click(screen.getByRole('button', { name: '+ Add Entry' }));
    expect(screen.getByLabelText('Day of Week')).toHaveFocus();
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('dialog')).toBeNull();
  });
});
