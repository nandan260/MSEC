import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { render, screen, fireEvent, cleanup, waitFor, within } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';

vi.mock('../../src/api', () => ({ apiRequest: vi.fn() }));
import { apiRequest } from '../../src/api';
import AdminScreen from '../../src/screens/AdminScreen.jsx';

const USERS = [
  { id: 1, email: 'alex@gmail.com', name: 'Alex Kumar', role: 'student', identifier: '1MS21CS084', department: 'CSE', semester: 6, active: true, google_linked: true, has_password: true },
  { id: 2, email: 'rao@gmail.com', name: 'Dr. Rao', role: 'faculty', identifier: 'EMP014', department: 'CSE', semester: 0, active: true, classes: [{ department: 'CSE', semester: 6 }], has_password: false },
  { id: 3, email: 'off@gmail.com', name: 'Old Student', role: 'student', identifier: '1MS20CS001', department: 'CSE', semester: 8, active: false, has_password: false },
];

function route(handlers) {
  apiRequest.mockImplementation(async (path, opts = {}) => {
    const key = `${(opts.method || 'GET').toUpperCase()} ${path.split('?')[0]}`;
    const h = handlers[key];
    if (!h) throw new Error(`unexpected ${key}`);
    return typeof h === 'function' ? h(path, opts) : h;
  });
}

beforeEach(() => { apiRequest.mockReset(); route({ 'GET /admin/roster': { users: USERS } }); });
afterEach(cleanup);

describe('AdminScreen', () => {
  it('lists the roster with role, class and status', async () => {
    render(<AdminScreen />);
    const alex = await screen.findByRole('listitem', { name: /Alex Kumar/ });
    expect(within(alex).getByText(/1MS21CS084 · CSE · Sem 6/)).toBeInTheDocument();
    const rao = screen.getByRole('listitem', { name: /Dr. Rao/ });
    expect(within(rao).getByText(/Classes: CSE-6/)).toBeInTheDocument();
    expect(within(screen.getByRole('listitem', { name: /Old Student/ })).getByText('Disabled')).toBeInTheDocument();
  });

  it('filters by search and role through the API', async () => {
    render(<AdminScreen />);
    await screen.findByRole('listitem', { name: /Alex Kumar/ });
    fireEvent.change(screen.getByLabelText('Search roster'), { target: { value: 'rao' } });
    fireEvent.change(screen.getByLabelText('Role'), { target: { value: 'faculty' } });
    await waitFor(() => expect(apiRequest).toHaveBeenLastCalledWith(expect.stringMatching(/\/admin\/roster\?.*q=rao.*role=faculty|\/admin\/roster\?.*role=faculty.*q=rao/)));
  });

  it('CSV dry-run preview shows row errors, then import confirms', async () => {
    const calls = [];
    route({
      'GET /admin/roster': { users: USERS },
      'POST /admin/roster/import': (_p, opts) => {
        const body = JSON.parse(opts.body);
        calls.push(body);
        return body.dry_run
          ? { created: 2, updated: 1, errors: [{ row: 4, email: 'bad@yahoo.com', message: 'Email must be valid and on an allowed domain.' }], dry_run: true }
          : { created: 2, updated: 1, errors: [], dry_run: false };
      },
    });
    render(<AdminScreen />);
    await screen.findByRole('listitem', { name: /Alex Kumar/ });
    const file = new File(['email,name,usn,role,branch,sem,classes\n'], 'roster.csv', { type: 'text/csv' });
    fireEvent.change(screen.getByLabelText('Upload roster CSV'), { target: { files: [file] } });
    const preview = await screen.findByRole('region', { name: 'Import preview' });
    expect(within(preview).getByText('2 new · 1 updated · 1 error')).toBeInTheDocument();
    expect(within(preview).getByText(/Row 4/)).toHaveTextContent('bad@yahoo.com');
    expect(calls[0].dry_run).toBe(true);
    fireEvent.click(within(preview).getByRole('button', { name: 'Import 3 rows' }));
    expect(await screen.findByRole('status')).toHaveTextContent('Imported: 2 new, 1 updated.');
    expect(calls[1].dry_run).toBe(false);
  });

  it('add user sheet posts the record', async () => {
    let posted;
    route({
      'GET /admin/roster': { users: USERS },
      'POST /admin/roster': (_p, opts) => { posted = JSON.parse(opts.body); return { user: { ...posted, id: 9 } }; },
    });
    render(<AdminScreen />);
    await screen.findByRole('listitem', { name: /Alex Kumar/ });
    fireEvent.click(screen.getByRole('button', { name: 'Add user' }));
    const sheet = screen.getByRole('dialog', { name: 'Add user' });
    fireEvent.change(within(sheet).getByLabelText('Email'), { target: { value: 'kid@gmail.com' } });
    fireEvent.change(within(sheet).getByLabelText('Name'), { target: { value: 'Kid' } });
    fireEvent.change(within(sheet).getByLabelText('USN / staff ID'), { target: { value: '1ME23CS100' } });
    fireEvent.change(within(sheet).getByLabelText('Branch'), { target: { value: 'CSE' } });
    fireEvent.change(within(sheet).getByLabelText('Semester'), { target: { value: '3' } });
    fireEvent.click(within(sheet).getByRole('button', { name: 'Save' }));
    await waitFor(() => expect(posted).toEqual({ email: 'kid@gmail.com', name: 'Kid', usn: '1ME23CS100', role: 'student', branch: 'CSE', sem: '3', classes: '' }));
  });

  it('edit sheet can disable and log out everywhere', async () => {
    const patches = [];
    route({
      'GET /admin/roster': { users: USERS },
      'PATCH /admin/roster/2': (_p, opts) => { const b = JSON.parse(opts.body); patches.push(b); return { user: { ...USERS[1], active: b.active ?? true } }; },
    });
    render(<AdminScreen />);
    fireEvent.click(await screen.findByRole('button', { name: 'Edit Dr. Rao' }));
    const sheet = screen.getByRole('dialog', { name: 'Edit user' });
    expect(within(sheet).getByLabelText('Classes')).toHaveValue('CSE-6');
    fireEvent.click(within(sheet).getByRole('button', { name: 'Log out everywhere' }));
    await waitFor(() => expect(patches).toContainEqual({ logout_all: true }));
    fireEvent.click(within(sheet).getByRole('button', { name: 'Disable' }));
    await waitFor(() => expect(patches).toContainEqual({ active: false }));
  });

  it('shows API errors', async () => {
    apiRequest.mockRejectedValue(new Error("You don't have access."));
    render(<AdminScreen />);
    expect(await screen.findByRole('alert')).toHaveTextContent("You don't have access.");
  });
});
