import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

vi.mock('../../src/api', async () => {
  class NetworkError extends Error {}
  return { apiRequest: vi.fn(), apiUrl: (p) => p, NetworkError };
});

import { apiRequest, NetworkError } from '../../src/api';
import AssignmentsView from '../../src/screens/AssignmentsScreen.jsx';

const rows = [
  { id: 1, course_code: 'CS601', title: 'Raft Lab', description: 'Implement Raft', deadline_date: '2026-11-20 23:59', max_marks: 25, submission_status: 'Pending', scored_marks: null, feedback: null },
  { id: 2, course_code: 'CS602', title: 'MLP Report', description: '', deadline_date: '2026-11-10 12:00', max_marks: 30, submission_status: 'Submitted', scored_marks: 27, feedback: 'Great work' },
  { id: 3, course_code: 'CS603', title: 'Parser', description: 'LL(1)', deadline_date: '2026-11-01 12:00', max_marks: 20, submission_status: 'Late', scored_marks: null, feedback: null },
];

beforeEach(() => {
  apiRequest.mockReset();
  apiRequest.mockImplementation(async (url, opts) => {
    if (opts?.method) return { message: 'ok' };
    if (url.includes('subject=CS602')) return { assignments: [rows[1]] };
    return { assignments: rows };
  });
});

describe('AssignmentsScreen', () => {
  it('renders assignment cards with status, score and student actions', async () => {
    render(<AssignmentsView userRole="student" />);
    expect(await screen.findByText('CS601: Raft Lab')).toBeInTheDocument();
    expect(screen.getByText('27 / 30')).toBeInTheDocument();
    expect(screen.getByText('"Great work"')).toBeInTheDocument();
    expect(screen.getAllByText('Pending Evaluation').length).toBe(2);
    expect(screen.getAllByRole('button', { name: 'Upload File' }).length).toBe(2);
    expect(screen.getByText('✓ Submitted')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '+ Create Assignment' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Grade & Feedback' })).toBeNull();
    expect(document.querySelector('table')).toBeNull();
  });

  it('shows ErrorCard and retry refetches', async () => {
    apiRequest.mockRejectedValueOnce(new NetworkError('down'));
    render(<AssignmentsView userRole="student" />);
    expect(await screen.findByText("Can't reach the server")).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
    expect(await screen.findByText('CS601: Raft Lab')).toBeInTheDocument();
  });

  it('subject filter requests the filtered list', async () => {
    render(<AssignmentsView userRole="student" />);
    await screen.findByText('CS601: Raft Lab');
    fireEvent.change(screen.getByLabelText('Subject'), { target: { value: 'CS602' } });
    expect(await screen.findByText('CS602: MLP Report')).toBeInTheDocument();
    expect(apiRequest).toHaveBeenCalledWith('/assignments?subject=CS602');
    expect(screen.queryByText('CS601: Raft Lab')).toBeNull();
  });

  it('ignores a late response from an older filter', async () => {
    const pending = {};
    apiRequest.mockImplementation((url) => new Promise((resolve) => { pending[url] = resolve; }));
    render(<AssignmentsView userRole="student" />);
    fireEvent.change(screen.getByLabelText('Subject'), { target: { value: 'CS602' } });
    pending['/assignments?subject=CS602']({ assignments: [rows[1]] });
    expect(await screen.findByText('CS602: MLP Report')).toBeInTheDocument();
    pending['/assignments']({ assignments: rows });
    await Promise.resolve();
    await Promise.resolve();
    expect(screen.queryByText('CS601: Raft Lab')).toBeNull();
  });

  it('student upload posts multipart to the upload endpoint; Escape closes; focus starts in the dialog', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ json: async () => ({ message: 'Uploaded' }) });
    vi.stubGlobal('fetch', fetchMock);
    render(<AssignmentsView userRole="student" />);
    await screen.findByText('CS601: Raft Lab');
    fireEvent.click(screen.getAllByRole('button', { name: 'Upload File' })[0]);
    expect(screen.getByLabelText(/Select Document/)).toHaveFocus();
    expect(document.querySelector('.sheet .sticky-actions')).not.toBeNull();
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('dialog')).toBeNull();

    fireEvent.click(screen.getAllByRole('button', { name: 'Upload File' })[0]);
    const file = new File(['x'], 'a.pdf', { type: 'application/pdf' });
    fireEvent.change(screen.getByLabelText(/Select Document/), { target: { files: [file] } });
    fireEvent.click(screen.getByRole('button', { name: 'Submit Deliverable' }));
    expect(await screen.findByText('Uploaded')).toBeInTheDocument();
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('/api/assignments/1/upload');
    expect(init.method).toBe('POST');
    expect(init.body.get('file').name).toBe('a.pdf');
    expect(init.body.get('student_name')).toBe('Alex Kumar');
  });

  it('upload network failure (TypeError) shows the network ErrorCard in the dialog', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')));
    render(<AssignmentsView userRole="student" />);
    await screen.findByText('CS601: Raft Lab');
    fireEvent.click(screen.getAllByRole('button', { name: 'Upload File' })[0]);
    fireEvent.click(screen.getByRole('button', { name: 'Submit Deliverable' }));
    expect(await screen.findByText("Can't reach the server")).toBeInTheDocument();
  });

  it('faculty creates an assignment with the same payload', async () => {
    render(<AssignmentsView userRole="faculty" />);
    await screen.findByText('CS601: Raft Lab');
    expect(screen.queryByRole('button', { name: 'Upload File' })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: '+ Create Assignment' }));
    fireEvent.change(screen.getByLabelText('Assignment Title'), { target: { value: 'Paxos' } });
    fireEvent.change(screen.getByLabelText('Description & Instructions'), { target: { value: 'Do it' } });
    fireEvent.click(screen.getByRole('button', { name: 'Publish Assignment' }));
    await waitFor(() =>
      expect(apiRequest).toHaveBeenCalledWith('/assignments', {
        method: 'POST',
        body: JSON.stringify({
          course_code: 'CS601', course_title: 'Course Term Work', title: 'Paxos', description: 'Do it',
          deadline_date: '2026-11-20 23:59', max_marks: 25, created_by: 'Faculty Member',
        }),
      }),
    );
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
  });

  it('faculty grades a submission with the same payload', async () => {
    render(<AssignmentsView userRole="admin" />);
    await screen.findByText('CS601: Raft Lab');
    fireEvent.click(screen.getAllByRole('button', { name: 'Grade & Feedback' })[1]);
    fireEvent.click(screen.getByRole('button', { name: 'Save Evaluation' }));
    await waitFor(() =>
      expect(apiRequest).toHaveBeenCalledWith('/assignments/2/evaluate', {
        method: 'POST',
        body: JSON.stringify({ scored_marks: 27, feedback: 'Great work', evaluated_by: 'Course Faculty' }),
      }),
    );
  });
});
