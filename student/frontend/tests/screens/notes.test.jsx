import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

vi.mock('../../src/api', async () => {
  class NetworkError extends Error {}
  return { apiRequest: vi.fn(), apiUrl: (p) => p, openExternal: vi.fn(), NetworkError };
});

import { apiRequest, openExternal, NetworkError } from '../../src/api';
import NotesView from '../../src/screens/NotesScreen.jsx';

const mats = [
  { id: 5, course_code: 'CS601', title: 'Raft Slides', category: 'Lecture Notes', file_format: 'PDF', file_size: '2 MB', uploaded_by: 'Dr. Rao', upload_date: '2026-10-01', downloads_count: 12 },
  { id: 6, course_code: 'CS602', title: 'ML Manual', category: 'Lab Manual', file_format: 'DOCX', file_size: '1 MB', uploaded_by: 'Dr. Iyer', upload_date: '2026-10-02', downloads_count: 3 },
];

beforeEach(() => {
  apiRequest.mockReset();
  openExternal.mockReset();
  apiRequest.mockResolvedValue({ materials: mats });
});

describe('NotesScreen', () => {
  it('renders material cards and downloads through openExternal', async () => {
    render(<NotesView userRole="student" />);
    expect(await screen.findByText('Raft Slides')).toBeInTheDocument();
    expect(screen.getByText('2 Documents Available')).toBeInTheDocument();
    expect(screen.getByText('Dr. Iyer')).toBeInTheDocument();
    expect(document.querySelector('table')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Download PDF' }));
    expect(openExternal).toHaveBeenCalledWith('/api/notes/5/download');
    expect(screen.queryByRole('button', { name: '+ Upload Study Material' })).toBeNull();
  });

  it('filters and search build the query', async () => {
    render(<NotesView userRole="student" />);
    await screen.findByText('Raft Slides');
    fireEvent.change(screen.getByLabelText('Subject'), { target: { value: 'CS602' } });
    await waitFor(() => expect(apiRequest).toHaveBeenCalledWith('/notes?subject=CS602'));
    fireEvent.change(screen.getByLabelText('Document type'), { target: { value: 'Lab Manual' } });
    await waitFor(() => expect(apiRequest).toHaveBeenCalledWith('/notes?subject=CS602&category=Lab+Manual'));
    fireEvent.change(screen.getByLabelText('Search'), { target: { value: 'ml' } });
    fireEvent.click(screen.getByRole('button', { name: 'Search' }));
    await waitFor(() => expect(apiRequest).toHaveBeenCalledWith('/notes?subject=CS602&category=Lab+Manual&search=ml'));
  });

  it('ignores a late response from an older filter', async () => {
    const pending = {};
    apiRequest.mockImplementation((url) => new Promise((resolve) => { pending[url] = resolve; }));
    render(<NotesView userRole="student" />);
    fireEvent.change(screen.getByLabelText('Subject'), { target: { value: 'CS602' } });
    pending['/notes?subject=CS602']({ materials: [mats[1]] });
    expect(await screen.findByText('ML Manual')).toBeInTheDocument();
    pending['/notes?']({ materials: [mats[0]] });
    await Promise.resolve();
    await Promise.resolve();
    expect(screen.queryByText('Raft Slides')).toBeNull();
  });

  it('shows the empty message', async () => {
    apiRequest.mockResolvedValue({ materials: [] });
    render(<NotesView userRole="student" />);
    expect(await screen.findByText('No study materials matched your filters.')).toBeInTheDocument();
  });

  it('shows ErrorCard and retry refetches', async () => {
    apiRequest.mockRejectedValueOnce(new NetworkError('down'));
    render(<NotesView userRole="student" />);
    expect(await screen.findByText("Can't reach the server")).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
    expect(await screen.findByText('Raft Slides')).toBeInTheDocument();
  });

  it('faculty uploads multipart to the upload endpoint; Escape closes', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ json: async () => ({ message: 'Uploaded' }) });
    vi.stubGlobal('fetch', fetchMock);
    vi.spyOn(window, 'alert').mockImplementation(() => {});
    render(<NotesView userRole="faculty" />);
    await screen.findByText('Raft Slides');
    fireEvent.click(screen.getByRole('button', { name: '+ Upload Study Material' }));
    expect(screen.getByLabelText('Subject Course')).toHaveFocus();
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('dialog')).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: '+ Upload Study Material' }));
    fireEvent.change(screen.getByLabelText('Document Title'), { target: { value: 'Paxos' } });
    const file = new File(['x'], 'p.pdf');
    fireEvent.change(screen.getByLabelText(/File \(PDF/), { target: { files: [file] } });
    fireEvent.submit(screen.getByRole('dialog').querySelector('form'));
    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('/api/notes/upload');
    expect(init.method).toBe('POST');
    expect(init.body.get('course_code')).toBe('CS601');
    expect(init.body.get('course_title')).toBe('Distributed Systems');
    expect(init.body.get('title')).toBe('Paxos');
    expect(init.body.get('category')).toBe('Lecture Notes');
    expect(init.body.get('uploaded_by')).toBe('Faculty Instructor');
    expect(init.body.get('file').name).toBe('p.pdf');
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
  });

  it('upload TypeError shows the network ErrorCard inside the dialog', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')));
    render(<NotesView userRole="admin" />);
    await screen.findByText('Raft Slides');
    fireEvent.click(screen.getByRole('button', { name: '+ Upload Study Material' }));
    fireEvent.change(screen.getByLabelText('Document Title'), { target: { value: 'Paxos' } });
    fireEvent.change(screen.getByLabelText(/File \(PDF/), { target: { files: [new File(['x'], 'p.pdf')] } });
    fireEvent.submit(screen.getByRole('dialog').querySelector('form'));
    expect(await screen.findByText("Can't reach the server")).toBeInTheDocument();
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });
});
