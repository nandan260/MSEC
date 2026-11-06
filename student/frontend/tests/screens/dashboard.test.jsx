import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';

afterEach(cleanup);

vi.mock('../../src/api', async () => {
  class NetworkError extends Error {}
  return { apiRequest: vi.fn(), NetworkError };
});

import { apiRequest, NetworkError } from '../../src/api';
import DashboardHome from '../../src/screens/DashboardScreen.jsx';

const summary = {
  student: { name: 'Alex Kumar', usn: '1MS21CS084', department: 'CSE', semester: 6, overall_attendance: 88.4, current_sgpa: 9.68, cgpa: 9.36 },
  upcoming_examinations: [
    { id: 1, course_code: 'CS601', course_title: 'Compilers', exam_date: '2026-12-01', start_time: '10:00', end_time: '13:00', exam_hall: 'Hall A', seat_number: 'S12' },
  ],
  pending_assignments: [{ id: 7, course_code: 'CS602', title: 'Lab 3', deadline_date: '2026-11-20', max_marks: 10 }],
  recent_announcements: [{ id: 3, title: 'Holiday', content: 'Campus closed', department: 'Admin', published_date: '2026-11-01', priority: 'High' }],
};

describe('DashboardScreen', () => {
  it('renders hero, stat tiles and data cards', async () => {
    apiRequest.mockResolvedValueOnce(summary);
    render(<DashboardHome onNavigate={() => {}} />);
    expect(await screen.findByText('Alex Kumar')).toBeInTheDocument();
    expect(screen.getByText('88.4%')).toBeInTheDocument();
    expect(screen.getByText('9.68')).toBeInTheDocument();
    expect(screen.getByText('9.36')).toBeInTheDocument();
    expect(screen.getByText('Eligible for Exams')).toHaveClass('pill--good');
    expect(screen.getByText('CS601 · Compilers')).toBeInTheDocument();
    expect(screen.getByText('CS602: Lab 3')).toBeInTheDocument();
    expect(screen.getByText('Holiday')).toBeInTheDocument();
  });

  it('navigates via View all and submits an assignment', async () => {
    apiRequest.mockResolvedValueOnce(summary);
    const onNavigate = vi.fn();
    render(<DashboardHome onNavigate={onNavigate} />);
    await screen.findByText('Alex Kumar');
    fireEvent.click(screen.getAllByRole('button', { name: 'View all' })[0]);
    expect(onNavigate).toHaveBeenCalledWith('examinations');
    apiRequest.mockResolvedValueOnce({}).mockResolvedValueOnce(summary);
    fireEvent.click(screen.getByRole('button', { name: 'Submit' }));
    await waitFor(() => expect(apiRequest).toHaveBeenCalledWith('/assignments/7/submit', { method: 'POST' }));
  });

  it('shows ErrorCard and retries', async () => {
    apiRequest.mockReset();
    apiRequest.mockRejectedValueOnce(new NetworkError('down')).mockResolvedValueOnce(summary);
    render(<DashboardHome onNavigate={() => {}} />);
    expect(await screen.findByText("Can't reach the server")).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
    expect(await screen.findByText('Alex Kumar')).toBeInTheDocument();
    expect(apiRequest).toHaveBeenCalledTimes(2);
  });
});
