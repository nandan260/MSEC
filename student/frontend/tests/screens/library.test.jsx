import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup, within } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

vi.mock('../../src/api', async () => {
  class NetworkError extends Error {}
  return { apiRequest: vi.fn(), apiUrl: (p) => p, NetworkError };
});

import { apiRequest, NetworkError } from '../../src/api';
import LibraryView from '../../src/screens/LibraryScreen.jsx';

const books = [
  { id: 1, title: 'Database Systems', edition: '7th', author: 'Korth', publisher: 'McGraw', isbn: '978-1', category: 'Computer Science', shelf_location: 'Rack CS-01', total_copies: 5, available_copies: 3, issued_copies: 2 },
  { id: 2, title: 'Linear Algebra', edition: '2nd', author: 'Strang', publisher: 'Wellesley', isbn: '978-2', category: 'Mathematics & Statistics', shelf_location: 'Rack M-02', total_copies: 2, available_copies: 0, issued_copies: 2 },
];
const mine = {
  borrowed_books: [
    { id: 11, title: 'Compilers', author: 'Aho', isbn: '978-3', shelf_location: 'Rack CS-09', issue_date: '2026-10-01', due_date: '2026-10-15', status: 'Overdue', overdue_days: 5, calculated_fine: 10, student_name: 'Alex Kumar', usn: '1MS21CS084' },
    { id: 12, title: 'Networks', author: 'Tan', isbn: '978-4', shelf_location: 'Rack CS-03', issue_date: '2026-11-01', due_date: '2026-11-15', status: 'Active', days_remaining: 9, calculated_fine: 0, student_name: 'Alex Kumar', usn: '1MS21CS084' },
  ],
  total_active: 2, total_overdue_fines: 10,
  reminders: [{ type: 'Overdue', severity: 'high', message: 'Return Compilers now' }],
};

beforeEach(() => {
  apiRequest.mockReset();
  apiRequest.mockImplementation(async (url, opts) => {
    if (opts?.method) return { message: 'Saved' };
    if (url.startsWith('/library/my-books')) return mine;
    if (url.startsWith('/library/history')) return { history: [{ id: 21, title: 'Old Book', author: 'Z', category: 'Information Science', issue_date: '2026-09-01', return_date: '2026-09-10', fine_amount: 4, librarian_remarks: '' }] };
    if (url.includes('category=Mathematics')) return { books: [books[1]], stats: { total_titles: 1, total_copies: 2, available_copies: 0, issued_copies: 2 } };
    return { books, stats: { total_titles: 12, total_copies: 80, available_copies: 55, issued_copies: 25 } };
  });
});

describe('LibraryScreen', () => {
  it('renders stats and book cards with availability; student sees View Shelf', async () => {
    vi.spyOn(window, 'alert').mockImplementation(() => {});
    render(<LibraryView userRole="student" />);
    expect(await screen.findByText('Database Systems')).toBeInTheDocument();
    expect(screen.getByText('12')).toBeInTheDocument();
    expect(screen.getByText('3 of 5 available')).toBeInTheDocument();
    expect(screen.getByText('0 of 2 available')).toBeInTheDocument();
    expect(screen.queryByRole('tab', { name: 'Circulation Desk' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Issue' })).toBeNull();
    fireEvent.click(screen.getAllByRole('button', { name: 'View Shelf' })[0]);
    expect(window.alert).toHaveBeenCalled();
    expect(document.querySelector('table')).toBeNull();
  });

  it('category filter requests the filtered catalog and ignores a stale response', async () => {
    const pending = {};
    apiRequest.mockImplementation((url) => new Promise((resolve) => { pending[url] = resolve; }));
    render(<LibraryView userRole="student" />);
    fireEvent.change(screen.getByLabelText('Category'), { target: { value: 'Mathematics & Statistics' } });
    pending['/library/books?category=Mathematics%20%26%20Statistics&']({ books: [books[1]] });
    expect(await screen.findByText('Linear Algebra')).toBeInTheDocument();
    pending['/library/books?']({ books });
    await Promise.resolve();
    await Promise.resolve();
    expect(screen.queryByText('Database Systems')).toBeNull();
  });

  it('my loans shows reminders, fines, and the return flow posts remarks', async () => {
    render(<LibraryView userRole="student" />);
    await screen.findByText('Database Systems');
    fireEvent.click(screen.getByRole('tab', { name: /My Loans/ }));
    expect(await screen.findByText('Compilers')).toBeInTheDocument();
    expect(screen.getByText(/Return Compilers now/)).toBeInTheDocument();
    expect(screen.getByText('Overdue by 5 day(s)')).toBeInTheDocument();
    expect(screen.getByText('9 day(s) remaining')).toBeInTheDocument();
    fireEvent.click(screen.getAllByRole('button', { name: 'Return Book' })[0]);
    expect(screen.getByLabelText('Clearance Remarks')).toHaveFocus();
    fireEvent.submit(screen.getByRole('dialog').querySelector('form'));
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    const call = apiRequest.mock.calls.find(([u]) => u === '/library/return/11');
    expect(call[1].method).toBe('POST');
    expect(JSON.parse(call[1].body)).toEqual({ remarks: 'Returned in good condition' });
  });

  it('history renders cards', async () => {
    render(<LibraryView userRole="student" />);
    await screen.findByText('Database Systems');
    fireEvent.click(screen.getByRole('tab', { name: 'History' }));
    expect(await screen.findByText('Old Book')).toBeInTheDocument();
    expect(screen.getByText('Rs 4.00')).toBeInTheDocument();
    expect(screen.getByText('Returned on schedule')).toBeInTheDocument();
  });

  it('shows ErrorCard and retry refetches', async () => {
    apiRequest.mockRejectedValueOnce(new NetworkError('down'));
    render(<LibraryView userRole="student" />);
    expect(await screen.findByText("Can't reach the server")).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
    expect(await screen.findByText('Database Systems')).toBeInTheDocument();
  });

  it('librarian issues from the dialog with the loan payload; Escape closes', async () => {
    render(<LibraryView userRole="faculty" />);
    await screen.findByText('Database Systems');
    fireEvent.click(screen.getAllByRole('button', { name: 'Issue' })[0]);
    expect(screen.getByLabelText('Student USN')).toHaveFocus();
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('dialog')).toBeNull();
    fireEvent.click(screen.getAllByRole('button', { name: 'Issue' })[0]);
    fireEvent.submit(screen.getByRole('dialog').querySelector('form'));
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    const call = apiRequest.mock.calls.find(([u]) => u === '/library/issue');
    expect(JSON.parse(call[1].body)).toEqual({ book_id: 1, usn: '1MS21CS084', student_name: 'Alex Kumar', days: 14 });
  });

  it('librarian adds a book; a failed add shows the error inside the dialog', async () => {
    render(<LibraryView userRole="admin" />);
    await screen.findByText('Database Systems');
    fireEvent.click(screen.getByRole('button', { name: '+ Add Book to Catalog' }));
    fireEvent.change(screen.getByLabelText('ISBN Identifier'), { target: { value: '978-9' } });
    fireEvent.change(screen.getByLabelText('Textbook Title'), { target: { value: 'New Book' } });
    fireEvent.change(screen.getByLabelText('Author(s)'), { target: { value: 'Me' } });
    apiRequest.mockRejectedValueOnce(new Error('Duplicate ISBN'));
    fireEvent.submit(screen.getByRole('dialog').querySelector('form'));
    expect(await within(screen.getByRole('dialog')).findByText('Duplicate ISBN')).toBeInTheDocument();
    fireEvent.submit(screen.getByRole('dialog').querySelector('form'));
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    const call = apiRequest.mock.calls.filter(([u, o]) => u === '/library/books' && o?.method === 'POST').pop();
    expect(JSON.parse(call[1].body)).toEqual({ isbn: '978-9', title: 'New Book', author: 'Me', category: 'Computer Science', publisher: '', edition: '1st Edition', shelf_location: 'Rack CS-01', total_copies: 5 });
  });

  it('circulation desk issue does not also open the Issue dialog', async () => {
    render(<LibraryView userRole="faculty" />);
    await screen.findByText('Database Systems');
    fireEvent.click(screen.getByRole('tab', { name: 'Circulation Desk' }));
    await screen.findByText('Process Return', { selector: 'button' }).catch(() => {});
    fireEvent.change(await screen.findByLabelText('Select Textbook from Catalog'), { target: { value: '1' } });
    expect(screen.queryByRole('dialog')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: /Confirm Issue/ }));
    await waitFor(() => expect(apiRequest.mock.calls.some(([u]) => u === '/library/issue')).toBe(true));
  });
});
