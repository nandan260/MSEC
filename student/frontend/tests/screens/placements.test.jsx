import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup, within } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

vi.mock('../../src/api', async () => {
  class NetworkError extends Error {}
  return { apiRequest: vi.fn(), apiUrl: (p) => p, openExternal: vi.fn(), openDownload: vi.fn(), NetworkError };
});

import { apiRequest, openExternal, openDownload, NetworkError } from '../../src/api';
import PlacementsView from '../../src/screens/PlacementsScreen.jsx';

const drives = [
  { id: 1, company_name: 'Acme Corp', job_title: 'SDE', job_type: 'Full-time', ctc_or_stipend: '28 LPA', location: 'Bangalore', min_cgpa: 7.5, eligible_branches: 'CSE', description: 'Build', required_skills: 'Java, Go', deadline_date: '2026-12-01', has_applied: false },
  { id: 2, company_name: 'Beta Labs', job_title: 'Intern', job_type: 'Internship', ctc_or_stipend: '80k', location: 'Pune', min_cgpa: 7, eligible_branches: 'ECE', description: 'Learn', required_skills: 'C', deadline_date: '2026-12-05', has_applied: true, application_status: 'Shortlisted' },
];
const apps = [{ id: 4, company_name: 'Acme Corp', job_title: 'SDE', job_type: 'Full-time', ctc_or_stipend: '28 LPA', applied_date: '2026-11-02', status: 'Applied', remarks: '' }];
const resume = { full_name: 'Alex Kumar', headline: 'Backend dev', email: 'a@x.edu', phone: '999', summary: 'Hello', skills: ['Go', 'Java'], certifications: ['AWS'], education: [{ degree: 'BE', institution: 'MSEC', year: '2026', score: '8.9' }], projects: [{ title: 'Raft', tech: 'Go', description: 'Consensus' }] };

beforeEach(() => {
  apiRequest.mockReset();
  openExternal.mockReset();
  openDownload.mockReset();
  apiRequest.mockImplementation(async (url, opts) => {
    if (opts?.method) return { message: 'Saved' };
    if (url.startsWith('/placements/drives')) return { drives: url.includes('type=internship') ? [drives[1]] : drives };
    if (url.startsWith('/placements/applications')) return { applications: apps };
    if (url.startsWith('/placements/resumes')) return { resumes: [{ id: 8, title: 'Core Resume', file_name: 'core.pdf', uploaded_at: '2026-10-01' }] };
    if (url.startsWith('/placements/resume-builder')) return { resume_data: resume };
    if (url.startsWith('/placements/interview-prep')) return { resources: [{ id: 1, title: 'DSA Guide', category: 'DSA', description: 'Trees', key_topics: 'Graphs' }], mock_questions: [{ id: 1, question: 'Explain CAP', company_tags: 'Acme', category: 'Systems', difficulty: 'Hard', sample_answer: 'Pick two' }] };
    return {};
  });
});

describe('PlacementsScreen', () => {
  it('renders drive cards with skills, deadline, applied state', async () => {
    render(<PlacementsView userRole="student" />);
    expect(await screen.findByText('Acme Corp')).toBeInTheDocument();
    expect(screen.getByText('28 LPA')).toBeInTheDocument();
    expect(screen.getByText('Java')).toBeInTheDocument();
    expect(screen.getByText('Applied (Shortlisted)')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Apply Now' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '+ Post Placement Drive' })).toBeNull();
    expect(document.querySelector('table')).toBeNull();
  });

  it('type filter requests the filtered list and ignores a stale response', async () => {
    const pending = {};
    apiRequest.mockImplementation((url) => new Promise((resolve) => { pending[url] = resolve; }));
    render(<PlacementsView userRole="student" />);
    fireEvent.click(screen.getByRole('button', { name: 'Internships' }));
    pending['/placements/drives?type=internship']({ drives: [drives[1]] });
    expect(await screen.findByText('Beta Labs')).toBeInTheDocument();
    pending['/placements/drives?']({ drives });
    await Promise.resolve();
    await Promise.resolve();
    expect(screen.queryByText('Acme Corp')).toBeNull();
  });

  it('apply flow posts drive_id and resume_name; Escape closes', async () => {
    render(<PlacementsView userRole="student" />);
    fireEvent.click(await screen.findByRole('button', { name: 'Apply Now' }));
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('dialog')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Apply Now' }));
    fireEvent.click(screen.getByLabelText('Alex Kumar - Distributed Systems Resume'));
    fireEvent.submit(screen.getByRole('dialog').querySelector('form'));
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    const call = apiRequest.mock.calls.find(([u]) => u === '/placements/apply');
    expect(JSON.parse(call[1].body)).toEqual({ drive_id: 1, resume_name: 'systems_resume_v2.pdf' });
  });

  it('a failed application shows the error inside the dialog', async () => {
    render(<PlacementsView userRole="student" />);
    fireEvent.click(await screen.findByRole('button', { name: 'Apply Now' }));
    apiRequest.mockRejectedValueOnce(new Error('CGPA too low'));
    fireEvent.submit(screen.getByRole('dialog').querySelector('form'));
    expect(await within(screen.getByRole('dialog')).findByText('CGPA too low')).toBeInTheDocument();
  });

  it('student sees applications without the coordinator select; admin can change status', async () => {
    const { unmount } = render(<PlacementsView userRole="student" />);
    await screen.findByText('Acme Corp');
    fireEvent.click(screen.getByRole('tab', { name: 'Applications' }));
    expect(await screen.findByText('Application under screening.')).toBeInTheDocument();
    expect(screen.queryByRole('combobox')).toBeNull();
    unmount();

    render(<PlacementsView userRole="admin" />);
    await screen.findByText('Acme Corp');
    fireEvent.click(screen.getByRole('tab', { name: 'Applications' }));
    fireEvent.change(await screen.findByLabelText('Update status for Acme Corp'), { target: { value: 'Selected' } });
    await waitFor(() => expect(apiRequest).toHaveBeenCalledWith('/placements/applications/4/status', { method: 'PUT', body: JSON.stringify({ status: 'Selected', remarks: 'Status updated to Selected by Coordinator.' }) }));
  });

  it('admin posts a drive with the full payload', async () => {
    render(<PlacementsView userRole="admin" />);
    fireEvent.click(await screen.findByRole('button', { name: '+ Post Placement Drive' }));
    fireEvent.change(screen.getByLabelText('Company Name'), { target: { value: 'Zeta' } });
    fireEvent.change(screen.getByLabelText('Job Title'), { target: { value: 'Dev' } });
    fireEvent.change(screen.getByLabelText('CTC / Stipend'), { target: { value: '10 LPA' } });
    fireEvent.change(screen.getByLabelText('Application Deadline'), { target: { value: '2026-12-10' } });
    fireEvent.change(screen.getByLabelText('Drive Date'), { target: { value: '2026-12-20' } });
    fireEvent.submit(screen.getByRole('dialog').querySelector('form'));
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    const call = apiRequest.mock.calls.find(([u, o]) => u === '/placements/drives' && o?.method === 'POST');
    expect(JSON.parse(call[1].body)).toMatchObject({ company_name: 'Zeta', job_title: 'Dev', job_type: 'Full-time', ctc_or_stipend: '10 LPA', location: 'Bangalore', min_cgpa: 7.5, eligible_branches: 'CSE, ISE, ECE', deadline_date: '2026-12-10', drive_date: '2026-12-20' });
  });

  it('resume vault: download uses openDownload; upload posts multipart via fetch', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ message: 'Uploaded' }) });
    vi.stubGlobal('fetch', fetchMock);
    render(<PlacementsView userRole="student" />);
    await screen.findByText('Acme Corp');
    fireEvent.click(screen.getByRole('tab', { name: 'Resume Vault' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Download Resume' }));
    expect(openDownload).toHaveBeenCalledWith('/api/placements/resumes/8/download');
    fireEvent.change(screen.getByLabelText(/Select Document/), { target: { files: [new File(['x'], 'r.pdf')] } });
    fireEvent.submit(screen.getByLabelText('Resume Version Title').closest('form'));
    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('/api/placements/resumes/upload');
    expect(init.method).toBe('POST');
    expect(init.body.get('title')).toBe('Core Software Resume');
    expect(init.body.get('resume').name).toBe('r.pdf');
    expect(await screen.findByRole('status')).toHaveTextContent('Uploaded');
  });

  it('resume builder edits, previews live and saves the data', async () => {
    render(<PlacementsView userRole="student" />);
    await screen.findByText('Acme Corp');
    fireEvent.click(screen.getByRole('tab', { name: 'Resume Builder' }));
    const name = await screen.findByLabelText('Full Name');
    expect(name).toHaveValue('Alex Kumar');
    expect(screen.getByText('Consensus', { exact: false })).toBeInTheDocument();
    fireEvent.change(name, { target: { value: 'Alex K' } });
    fireEvent.change(screen.getByLabelText('Technical Skills (Comma Separated)'), { target: { value: 'Go, Rust' } });
    expect(screen.getByText('Rust')).toBeInTheDocument();
    fireEvent.submit(name.closest('form'));
    await waitFor(() => expect(apiRequest.mock.calls.some(([u, o]) => u === '/placements/resume-builder' && o?.method === 'POST')).toBe(true));
    const call = apiRequest.mock.calls.find(([u, o]) => u === '/placements/resume-builder' && o?.method === 'POST');
    expect(JSON.parse(call[1].body)).toMatchObject({ full_name: 'Alex K', skills: ['Go', 'Rust'] });
  });

  it('interview prep reveals a model answer on tap', async () => {
    render(<PlacementsView userRole="student" />);
    await screen.findByText('Acme Corp');
    fireEvent.click(screen.getByRole('tab', { name: 'Interview Prep' }));
    expect(await screen.findByText('DSA Guide')).toBeInTheDocument();
    expect(screen.queryByText('Pick two')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: /Explain CAP/ }));
    expect(screen.getByText('Pick two')).toBeInTheDocument();
  });

  it('shows ErrorCard and retry refetches', async () => {
    apiRequest.mockRejectedValueOnce(new NetworkError('down'));
    render(<PlacementsView userRole="student" />);
    expect(await screen.findByText("Can't reach the server")).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
    expect(await screen.findByText('Acme Corp')).toBeInTheDocument();
  });
});
