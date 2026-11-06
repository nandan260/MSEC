import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';

afterEach(cleanup);

vi.mock('../../src/api', async () => {
  class NetworkError extends Error {}
  return { apiRequest: vi.fn(), NetworkError };
});

import { apiRequest, NetworkError } from '../../src/api';
import ExaminationsView from '../../src/screens/ExaminationsScreen.jsx';

const exams = [
  { id: 1, course_code: 'CS601', course_title: 'Distributed Systems', exam_date: '2026-12-01', start_time: '10:00 AM', end_time: '01:00 PM', exam_hall: 'Hall-A', seat_number: 'A-12' },
  { id: 2, course_code: 'CS602', course_title: 'Machine Learning', exam_date: '2026-12-03', start_time: '10:00 AM', end_time: '01:00 PM', exam_hall: 'Hall-B', seat_number: 'B-07' },
];
const base = {
  examinations: exams,
  registration: { candidate_name: 'Alex Kumar', usn: '1MS22CS001', department: 'CSE', semester: 6, exam_center: 'Main Block', seat_status: 'Allotted' },
};
const revals = [{ id: 9, usn: '1MS22CS001', course_code: 'CS601', application_type: 'Photocopy', fee_status: 'Paid', status: 'Verified', remarks: '', applied_date: '2026-11-02' }];
let published = 1;

beforeEach(() => {
  published = 1;
  apiRequest.mockReset();
  apiRequest.mockImplementation(async (url, opts) => {
    if (opts?.method) return { message: 'done' };
    if (url === '/examinations/revaluation') return { revaluations: revals };
    return { ...base, hall_ticket: { is_published: published, exam_cycle: 'Nov 2026 Cycle' } };
  });
  vi.spyOn(window, 'alert').mockImplementation(() => {});
});

describe('ExaminationsScreen', () => {
  it('renders hall ticket, timetable and revaluation cards', async () => {
    render(<ExaminationsView userRole="student" />);
    expect(await screen.findByText('CS601: Distributed Systems', { selector: '.data-card-title' })).toBeInTheDocument();
    expect(screen.getByText('Official Admit Card Released')).toBeInTheDocument();
    expect(screen.getByText('Nov 2026 Cycle')).toBeInTheDocument();
    expect(screen.getAllByText('1MS22CS001').length).toBe(2);
    expect(screen.getByText('Hall-B')).toBeInTheDocument();
    expect(screen.getByText('CS601: Photocopy')).toBeInTheDocument();
    expect(screen.getByText('Verification in progress.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Admin:/ })).toBeNull();
    expect(document.querySelector('table')).toBeNull();
  });

  it('shows the unpublished notice', async () => {
    published = 0;
    render(<ExaminationsView userRole="student" />);
    expect(await screen.findByText('Not Yet Published')).toBeInTheDocument();
    expect(screen.getByText(/Hall tickets are currently not published/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Print Hall Ticket' })).toBeNull();
  });

  it('shows ErrorCard and retry refetches', async () => {
    apiRequest.mockRejectedValueOnce(new NetworkError('down'));
    render(<ExaminationsView userRole="student" />);
    expect(await screen.findByText("Can't reach the server")).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
    expect(await screen.findByText('CS601: Distributed Systems', { selector: '.data-card-title' })).toBeInTheDocument();
  });

  it('submits a revaluation with the same payload', async () => {
    render(<ExaminationsView userRole="student" />);
    await screen.findByText('CS601: Distributed Systems', { selector: '.data-card-title' });
    fireEvent.change(screen.getByLabelText('Select Course for Review'), { target: { value: 'CS602' } });
    fireEvent.change(screen.getByLabelText('Application Type'), { target: { value: 'Both' } });
    fireEvent.click(screen.getByRole('button', { name: 'Submit Revaluation Application' }));
    await waitFor(() =>
      expect(apiRequest).toHaveBeenCalledWith('/examinations/revaluation', {
        method: 'POST',
        body: JSON.stringify({ course_code: 'CS602', application_type: 'Both' }),
      }),
    );
    expect(await screen.findByText('done')).toBeInTheDocument();
  });

  it('revaluation failure shows ErrorCard with a retry that resubmits', async () => {
    render(<ExaminationsView userRole="student" />);
    await screen.findByText('CS601: Distributed Systems', { selector: '.data-card-title' });
    apiRequest.mockRejectedValueOnce(new NetworkError('down'));
    fireEvent.click(screen.getByRole('button', { name: 'Submit Revaluation Application' }));
    expect(await screen.findByText("Can't reach the server")).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
    expect(await screen.findByText('done')).toBeInTheDocument();
  });

  it('only admin sees the publish toggle and it posts the flipped flag', async () => {
    render(<ExaminationsView userRole="admin" />);
    await screen.findByText('CS601: Distributed Systems', { selector: '.data-card-title' });
    fireEvent.click(screen.getByRole('button', { name: 'Admin: Unpublish Hall Tickets' }));
    await waitFor(() =>
      expect(apiRequest).toHaveBeenCalledWith('/examinations/hall-ticket/publish', {
        method: 'POST',
        body: JSON.stringify({ is_published: 0 }),
      }),
    );
  });
});
