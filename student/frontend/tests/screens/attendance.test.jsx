import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';

afterEach(cleanup);

vi.mock('../../src/api', async () => {
  class NetworkError extends Error {}
  return { apiRequest: vi.fn(), NetworkError };
});

import { apiRequest, NetworkError } from '../../src/api';
import AttendanceView from '../../src/screens/AttendanceScreen.jsx';
import AttendanceCalculatorView from '../../src/screens/AttendanceCalculatorScreen.jsx';
import { attendanceTone } from '../../src/screens/shared.js';

const attendance = {
  overall_summary: { overall_percentage: 91.7, overall_status: 'Eligible', total_conducted: 48, total_attended: 42, total_absent: 4, total_od: 2 },
  attendance: [
    { id: 1, course_code: 'CS601', course_title: 'Compilers', faculty_name: 'Dr. Rao', total_hours: 48, attended_hours: 42, absent_hours: 4, od_hours: 2, percentage: 91.7, safe_bunks: 10, needed_to_reach_75: 0, status: 'Eligible' },
    { id: 2, course_code: 'CS602', course_title: 'Networks', faculty_name: 'Dr. Iyer', total_hours: 40, attended_hours: 24, absent_hours: 16, od_hours: 0, percentage: 60, safe_bunks: 0, needed_to_reach_75: 12, status: 'Shortage' },
  ],
};

beforeEach(() => apiRequest.mockReset());

describe('attendanceTone', () => {
  it('maps thresholds', () => {
    expect(attendanceTone(85)).toBe('good');
    expect(attendanceTone(84.9)).toBe('warn');
    expect(attendanceTone(75)).toBe('warn');
    expect(attendanceTone(74.9)).toBe('bad');
  });
});

describe('AttendanceScreen', () => {
  it('renders summary and one card per course with tone pills', async () => {
    apiRequest.mockResolvedValueOnce(attendance);
    render(<AttendanceView userRole="student" />);
    expect(await screen.findByText('Compilers')).toBeInTheDocument();
    expect(screen.getByText(/is below 75%/)).toHaveTextContent('Networks is below 75%');
    expect(screen.getByText('91.7%', { selector: '.subject-attendance__percent' })).toHaveClass('ink-good');
    expect(screen.getByText('60%')).toHaveClass('ink-bad');
    expect(screen.getByText('CS601 · 42/48 (+2 OD)')).toBeInTheDocument();
    fireEvent.click(screen.getByText('Networks', { selector: '.reference-list__text > strong' }));
    expect(screen.getByText('Need 12 consecutive classes')).toBeVisible();
    expect(screen.queryByText('Log Session Attendance')).toBeNull();
  });

  it('shows ErrorCard and retries', async () => {
    apiRequest.mockRejectedValueOnce(new NetworkError('down')).mockResolvedValueOnce(attendance);
    render(<AttendanceView userRole="student" />);
    expect(await screen.findByText("Can't reach the server")).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
    expect(await screen.findByText('Compilers')).toBeInTheDocument();
    expect(apiRequest).toHaveBeenCalledTimes(2);
  });
});

describe('AttendanceCalculatorScreen', () => {
  // Values are what POST /attendance/calculate returns for 48 total, 42 attended, 2 OD, 75% target.
  const sim = { course_name: 'Compilers', total_conducted: 48, classes_attended: 44, target_percentage: 75, current_percentage: 91.7, status: 'Eligible', max_bunks: 10, needed_classes: 0, projected_if_miss_one: 89.8, projected_if_attend_one: 91.8, message: 'You are safely above 75.0% (91.7%). You can miss up to 10 consecutive classes.' };

  it('pins the request payload and renders the outcome in plain words', async () => {
    apiRequest.mockResolvedValueOnce(attendance).mockResolvedValueOnce(sim);
    render(<AttendanceCalculatorView />);
    expect(await screen.findByText('10 safe bunks remaining')).toBeInTheDocument();
    expect(apiRequest).toHaveBeenNthCalledWith(2, '/attendance/calculate', {
      method: 'POST',
      body: JSON.stringify({ total_hours: 48, attended_hours: 42, od_hours: 2, target_percentage: 75, course_name: 'Compilers' }),
    });
    expect(screen.getByText('44 / 48 hrs')).toBeInTheDocument();
    expect(screen.getByText('89.8%')).toBeInTheDocument();
    expect(screen.getByText('91.8%')).toBeInTheDocument();
  });

  it('shows shortage wording and re-runs on submit with edited values', async () => {
    apiRequest.mockResolvedValueOnce(attendance).mockResolvedValueOnce(sim);
    render(<AttendanceCalculatorView />);
    await screen.findByText('10 safe bunks remaining');
    apiRequest.mockResolvedValueOnce({ ...sim, status: 'Shortage', needed_classes: 12, current_percentage: 60 });
    fireEvent.change(screen.getByLabelText('Classes attended'), { target: { value: '20' } });
    fireEvent.click(screen.getByRole('button', { name: 'Run Attendance Simulation' }));
    expect(await screen.findByText('Must attend next 12 consecutive classes')).toBeInTheDocument();
    expect(JSON.parse(apiRequest.mock.calls[2][1].body).attended_hours).toBe(20);
  });

  it('shows ErrorCard when subjects fail to load and retries', async () => {
    apiRequest.mockRejectedValueOnce(new NetworkError('down')).mockResolvedValueOnce(attendance).mockResolvedValueOnce(sim);
    render(<AttendanceCalculatorView />);
    expect(await screen.findByText("Can't reach the server")).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
    await waitFor(() => expect(screen.getByText('10 safe bunks remaining')).toBeInTheDocument());
  });
});
