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
import ProjectsView from '../../src/screens/ProjectsScreen.jsx';

const projects = [
  { id: 1, title: 'Raft Store', category: 'Capstone Project', student_name: 'Asha', usn: '1MS21CS001', description: 'KV store', technologies: 'Go, gRPC', guide_name: 'Dr Rao', guide_status: 'Approved', team_status: 'Looking for Teammates', open_roles: '1 UI Dev', avg_score: 44, github_url: 'https://github.com/x/y', document_file: 'a.pdf' },
  { id: 2, title: 'Paper Bot', category: 'Research', student_name: 'Ben', usn: '1MS21CS002', description: 'NLP', technologies: 'Python', guide_name: '', guide_status: 'Pending', team_status: 'Team Full', open_roles: '', avg_score: null, github_url: '', document_file: null },
];

beforeEach(() => {
  apiRequest.mockReset();
  openExternal.mockReset();
  openDownload.mockReset();
  apiRequest.mockImplementation(async (url, opts) => {
    if (opts?.method) return { message: 'Saved' };
    if (url.includes('category=Research')) return { projects: [projects[1]] };
    return { projects };
  });
});

describe('ProjectsScreen', () => {
  it('renders project cards with tech pills, team state and score; student has no Evaluate', async () => {
    render(<ProjectsView userRole="student" />);
    expect(await screen.findByText('Raft Store')).toBeInTheDocument();
    expect(screen.getByText('Asha (1MS21CS001)')).toBeInTheDocument();
    expect(screen.getByText('gRPC')).toBeInTheDocument();
    expect(screen.getByText('44 / 50')).toBeInTheDocument();
    expect(screen.getByText('Team Status: Full')).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: 'Join Team' }).length).toBe(1);
    expect(screen.queryByRole('button', { name: 'Evaluate' })).toBeNull();
    expect(screen.getByRole('link', { name: 'GitHub Repo' })).toHaveAttribute('href', 'https://github.com/x/y');
    expect(document.querySelector('table')).toBeNull();
  });

  it('document download uses openDownload', async () => {
    render(<ProjectsView userRole="student" />);
    fireEvent.click(await screen.findByRole('button', { name: 'Architecture PDF' }));
    expect(openDownload).toHaveBeenCalledWith('/api/projects/1/document/download');
  });

  it('category filter requests the filtered list and ignores a stale response', async () => {
    const pending = {};
    apiRequest.mockImplementation((url) => new Promise((resolve) => { pending[url] = resolve; }));
    render(<ProjectsView userRole="student" />);
    fireEvent.change(screen.getByLabelText('Category'), { target: { value: 'Research' } });
    pending['/projects?category=Research']({ projects: [projects[1]] });
    expect(await screen.findByText('Paper Bot')).toBeInTheDocument();
    pending['/projects?']({ projects });
    await Promise.resolve();
    await Promise.resolve();
    expect(screen.queryByText('Raft Store')).toBeNull();
  });

  it('shows ErrorCard and retry refetches', async () => {
    apiRequest.mockRejectedValueOnce(new NetworkError('down'));
    render(<ProjectsView userRole="student" />);
    expect(await screen.findByText("Can't reach the server")).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
    expect(await screen.findByText('Raft Store')).toBeInTheDocument();
  });

  it('join request posts the role payload; Escape closes', async () => {
    render(<ProjectsView userRole="student" />);
    fireEvent.click(await screen.findByRole('button', { name: 'Join Team' }));
    expect(screen.getByLabelText('Role You Want to Fill')).toHaveFocus();
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('dialog')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Join Team' }));
    fireEvent.change(screen.getByLabelText(/Contribution Pitch/), { target: { value: 'I know React' } });
    fireEvent.submit(screen.getByRole('dialog').querySelector('form'));
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    const call = apiRequest.mock.calls.find(([u]) => u === '/projects/1/teammate-request');
    expect(JSON.parse(call[1].body)).toEqual({ role_applied: 'Frontend Engineer', message: 'I know React', requester_name: 'Alex Kumar', requester_usn: '1MS21CS084' });
    expect(await screen.findByText('Saved')).toBeInTheDocument();
  });

  it('faculty evaluation posts the faculty name and score; admin uses the Dean name', async () => {
    const { unmount } = render(<ProjectsView userRole="faculty" />);
    fireEvent.click((await screen.findAllByRole('button', { name: 'Evaluate' }))[0]);
    fireEvent.change(screen.getByLabelText(/Faculty Written Feedback/), { target: { value: 'Solid' } });
    fireEvent.submit(screen.getByRole('dialog').querySelector('form'));
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    let call = apiRequest.mock.calls.find(([u]) => u === '/projects/1/feedback');
    expect(JSON.parse(call[1].body)).toEqual({ faculty_name: 'Dr. Ramesh Rao', score: 48, max_score: 50, comments: 'Solid' });
    unmount();

    apiRequest.mockClear();
    render(<ProjectsView userRole="admin" />);
    fireEvent.click((await screen.findAllByRole('button', { name: 'Evaluate' }))[1]);
    fireEvent.change(screen.getByLabelText(/Faculty Written Feedback/), { target: { value: 'Ok' } });
    fireEvent.submit(screen.getByRole('dialog').querySelector('form'));
    await waitFor(() => expect(apiRequest.mock.calls.some(([u]) => u === '/projects/2/feedback')).toBe(true));
    call = apiRequest.mock.calls.find(([u]) => u === '/projects/2/feedback');
    expect(JSON.parse(call[1].body).faculty_name).toBe('Dean Academics');
  });

  it('showcase posts multipart via fetch; a failure shows inside the dialog', async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce({ ok: false, json: async () => ({ error: 'Title taken' }) })
      .mockResolvedValue({ ok: true, json: async () => ({ message: 'Published' }) });
    vi.stubGlobal('fetch', fetchMock);
    render(<ProjectsView userRole="student" />);
    fireEvent.click(await screen.findByRole('button', { name: '+ Showcase Academic Project' }));
    fireEvent.change(screen.getByLabelText('Project Title'), { target: { value: 'New One' } });
    fireEvent.change(screen.getByLabelText(/Technologies Used/), { target: { value: 'Rust' } });
    fireEvent.change(screen.getByLabelText(/Detailed Abstract/), { target: { value: 'About' } });
    fireEvent.change(screen.getByLabelText(/Architecture \/ Report/), { target: { files: [new File(['x'], 'd.pdf')] } });
    fireEvent.submit(screen.getByRole('dialog').querySelector('form'));
    expect(await within(screen.getByRole('dialog')).findByText('Title taken')).toBeInTheDocument();
    fireEvent.submit(screen.getByRole('dialog').querySelector('form'));
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    const [url, init] = fetchMock.mock.calls[1];
    expect(url).toBe('/api/projects');
    expect(init.method).toBe('POST');
    expect(init.body.get('title')).toBe('New One');
    expect(init.body.get('technologies')).toBe('Rust');
    expect(init.body.get('team_status')).toBe('Looking for Teammates');
    expect(init.body.get('document_file').name).toBe('d.pdf');
    expect(await screen.findByText('Published')).toBeInTheDocument();
  });
});
