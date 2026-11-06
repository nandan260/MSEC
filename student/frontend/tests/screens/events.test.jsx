import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

vi.mock('../../src/api', async () => {
  class NetworkError extends Error {}
  return { apiRequest: vi.fn(), apiUrl: (p) => p, openExternal: vi.fn(), NetworkError };
});

import { apiRequest, openExternal, NetworkError } from '../../src/api';
import EventsView from '../../src/screens/EventsScreen.jsx';

const events = [
  { id: 7, title: 'Hack Night', category: 'Hackathon', club_name: 'ACM', event_date: '2026-12-01', event_time: '10:00 AM', venue: 'Auditorium', seats_booked: 10, seats_total: 100, registration_deadline: '2026-11-28', description: 'Build things', is_registered: false },
  { id: 8, title: 'Cloud Talk', category: 'Workshop', club_name: 'AWS', event_date: '2026-12-05', event_time: '2:00 PM', venue: 'Lab 2', seats_booked: 50, seats_total: 50, registration_deadline: '2026-12-01', description: 'Cloud', is_registered: true, attendance_status: 'Registered' },
];
const regs = [
  { reg_id: 31, title: 'Hack Night', category: 'Hackathon', club_name: 'ACM', event_date: '2026-12-01', venue: 'Auditorium', attendance_status: 'Attended', certificate_issued: 1 },
  { reg_id: 32, title: 'Cloud Talk', category: 'Workshop', club_name: 'AWS', event_date: '2026-12-05', venue: 'Lab 2', attendance_status: 'Registered', certificate_issued: 0 },
];

beforeEach(() => {
  apiRequest.mockReset();
  openExternal.mockReset();
  apiRequest.mockImplementation(async (url, opts) => {
    if (opts?.method) return { message: 'Done' };
    if (url.startsWith('/events/my-registrations')) return { registrations: regs };
    if (url.includes('category=Workshop')) return { events: [events[1]] };
    return { events };
  });
});

describe('EventsScreen', () => {
  it('renders event cards with seats, sold-out and registered states', async () => {
    render(<EventsView userRole="student" />);
    expect(await screen.findByText('Hack Night')).toBeInTheDocument();
    expect(screen.getByText('10 / 100')).toBeInTheDocument();
    expect(screen.getByText('Pass Confirmed (Registered)')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Register for Event' })).toBeEnabled();
    expect(screen.queryByRole('button', { name: '+ Post New Event' })).toBeNull();
    expect(screen.queryByRole('tab', { name: 'Issue Certificates' })).toBeNull();
    expect(document.querySelector('table')).toBeNull();
  });

  it('register posts to the register endpoint and shows the message', async () => {
    render(<EventsView userRole="student" />);
    fireEvent.click(await screen.findByRole('button', { name: 'Register for Event' }));
    expect(await screen.findByText('Done')).toBeInTheDocument();
    expect(apiRequest).toHaveBeenCalledWith('/events/7/register', { method: 'POST' });
  });

  it('category filter requests the filtered list', async () => {
    render(<EventsView userRole="student" />);
    await screen.findByText('Hack Night');
    fireEvent.change(screen.getByLabelText('Category'), { target: { value: 'Workshop' } });
    expect(await screen.findByText('Cloud Talk')).toBeInTheDocument();
    expect(apiRequest).toHaveBeenCalledWith('/events?category=Workshop');
    expect(screen.queryByText('Hack Night')).toBeNull();
  });

  it('ignores a late response from an older filter', async () => {
    const pending = {};
    apiRequest.mockImplementation((url) => new Promise((resolve) => { pending[url] = resolve; }));
    render(<EventsView userRole="student" />);
    fireEvent.change(screen.getByLabelText('Category'), { target: { value: 'Workshop' } });
    pending['/events?category=Workshop']({ events: [events[1]] });
    expect(await screen.findByText('Cloud Talk')).toBeInTheDocument();
    pending['/events?']({ events });
    await Promise.resolve();
    await Promise.resolve();
    expect(screen.queryByText('Hack Night')).toBeNull();
  });

  it('my passes: certificate download uses openExternal(apiUrl)', async () => {
    render(<EventsView userRole="student" />);
    await screen.findByText('Hack Night');
    fireEvent.click(screen.getByRole('tab', { name: 'My Passes' }));
    expect(await screen.findByText('2 Registrations on File')).toBeInTheDocument();
    expect(screen.getByText('Certificate Pending Attendance')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Download Certificate (PDF)' }));
    expect(openExternal).toHaveBeenCalledWith('/api/events/certificates/31/download');
  });

  it('shows ErrorCard and retry refetches', async () => {
    apiRequest.mockRejectedValueOnce(new NetworkError('down'));
    render(<EventsView userRole="student" />);
    expect(await screen.findByText("Can't reach the server")).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
    expect(await screen.findByText('Hack Night')).toBeInTheDocument();
  });

  it('admin posts a new event with the full payload; Escape closes', async () => {
    render(<EventsView userRole="admin" />);
    await screen.findByText('Hack Night');
    fireEvent.click(screen.getByRole('button', { name: '+ Post New Event' }));
    expect(screen.getByLabelText('Event Title')).toHaveFocus();
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('dialog')).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: '+ Post New Event' }));
    fireEvent.change(screen.getByLabelText('Event Title'), { target: { value: 'Quiz' } });
    fireEvent.change(screen.getByLabelText('Event Date'), { target: { value: '2026-12-10' } });
    fireEvent.change(screen.getByLabelText(/Event Description/), { target: { value: 'Fun' } });
    fireEvent.change(screen.getByLabelText('Registration Cutoff Deadline'), { target: { value: '2026-12-08' } });
    fireEvent.submit(screen.getByRole('dialog').querySelector('form'));
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    const call = apiRequest.mock.calls.find(([u, o]) => u === '/events' && o?.method === 'POST');
    expect(JSON.parse(call[1].body)).toEqual({
      title: 'Quiz', category: 'Hackathon', club_name: 'ACM Chapter', event_date: '2026-12-10', event_time: '10:00 AM',
      venue: 'Main Auditorium', description: 'Fun', registration_deadline: '2026-12-08', seats_total: 100,
    });
  });

  it('admin delete confirms then calls DELETE', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    render(<EventsView userRole="admin" />);
    const [del] = await screen.findAllByRole('button', { name: 'Delete' });
    fireEvent.click(del);
    await waitFor(() => expect(apiRequest).toHaveBeenCalledWith('/events/7', { method: 'DELETE' }));
  });

  it('faculty certificate desk posts multipart to the upload endpoint for the shown event', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ message: 'Issued' }) });
    vi.stubGlobal('fetch', fetchMock);
    // Events whose ids do not include 1: the select shows event 7, so 7 must be submitted.
    render(<EventsView userRole="faculty" />);
    await screen.findByText('Hack Night');
    fireEvent.click(screen.getByRole('tab', { name: 'Issue Certificates' }));
    fireEvent.change(screen.getByLabelText(/Upload Certificate Document/), { target: { files: [new File(['x'], 'c.pdf')] } });
    fireEvent.submit(screen.getByLabelText('Recipient Student USN').closest('form'));
    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('/api/events/7/certificate/upload');
    expect(init.body.get('usn')).toBe('1MS21CS084');
    expect(init.body.get('certificate_title')).toBe('Certificate of Participation & Merit');
    expect(init.body.get('certificate').name).toBe('c.pdf');
    expect(await screen.findByText('Issued')).toBeInTheDocument();
  });
});
