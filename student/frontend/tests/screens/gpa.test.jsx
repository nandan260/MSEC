import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup, within } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';

afterEach(cleanup);

vi.mock('../../src/api', async () => {
  class NetworkError extends Error {}
  return { apiRequest: vi.fn(), NetworkError };
});

import { apiRequest, NetworkError } from '../../src/api';
import GpaCalculatorView from '../../src/screens/GpaCalculatorScreen.jsx';

const hist = [
  {
    id: 11, semester: 5, total_credits: 22, total_credit_points: 209, sgpa: 9.5, cumulative_cgpa: 9.4,
    subjects: [{ subject_name: 'Networks', credits: 4, letter_grade: 'O', grade_point: 10 }],
  },
];
let history = [];

beforeEach(() => {
  history = [];
  apiRequest.mockReset();
  apiRequest.mockImplementation(async (url, opts) => {
    if (url === '/gpa/history' && !opts) return { history, overall_cgpa: 9.36, total_credits_earned: 128 };
    if (url === '/gpa/calculate-sgpa') return { sgpa: 9.68, total_credits: 22, total_credit_points: 213, formula: 'SGPA = 213 / 22 = 9.68' };
    if (url === '/gpa/calculate-cgpa') return { cgpa: 9.36, formula: 'CGPA = server' };
    return { message: 'saved' };
  });
});

describe('GpaCalculatorScreen', () => {
  it('pins the calculation output for the default inputs', async () => {
    render(<GpaCalculatorView />);
    // Default courses: 22 credits, 213.0 credit points -> SGPA 9.68 (output of the original component).
    expect(await screen.findByText('SGPA = 213.0 / 22 = 9.68')).toBeInTheDocument();
    expect(document.querySelector('.gpa__note')).toHaveTextContent('Total Credits: 22 | Total Credit Points: 213.0');
    expect(document.querySelector('.gpa__big')).toHaveTextContent('9.68 / 10.00');

    fireEvent.click(screen.getByRole('button', { name: 'CGPA' }));
    // Default semesters: 128 credits, 1198.00 points -> CGPA 9.36; target 9.40 over 40 credits needs SGPA 9.53.
    expect(screen.getByText('CGPA = 1198.00 / 128 = 9.36')).toBeInTheDocument();
    expect(document.querySelector('.gpa__note')).toHaveTextContent('Total Credits Across Semesters: 128 | Sum of Grade Points: 1198.00');
    expect(screen.getByText('9.53', { exact: false, selector: '.gpa__big' })).toBeInTheDocument();
  });

  it('changing a grade updates credit points live', async () => {
    render(<GpaCalculatorView />);
    await screen.findByText('SGPA = 213.0 / 22 = 9.68');
    fireEvent.change(screen.getByLabelText('Grade', { selector: '#gpa-grade-0' }), { target: { value: 'B' } });
    // first course 4 credits at 6 -> 24 instead of 40: 197 / 22 = 8.95
    expect(screen.getByText('SGPA = 197.0 / 22 = 8.95')).toBeInTheDocument();
  });

  it('Calculate SGPA posts the courses and shows the server result', async () => {
    render(<GpaCalculatorView />);
    await screen.findByText('SGPA = 213.0 / 22 = 9.68');
    fireEvent.click(screen.getByRole('button', { name: 'Calculate SGPA' }));
    expect(await screen.findByText('SGPA = 213 / 22 = 9.68')).toBeInTheDocument();
    const call = apiRequest.mock.calls.find((c) => c[0] === '/gpa/calculate-sgpa');
    const body = JSON.parse(call[1].body);
    expect(call[1].method).toBe('POST');
    expect(body.courses).toHaveLength(6);
    expect(body.courses[2]).toEqual({ name: 'Compiler Design', credits: 4, grade: 'A+', grade_point: 9 });
  });

  it('validates credits before calling the API', async () => {
    render(<GpaCalculatorView />);
    await screen.findByText('SGPA = 213.0 / 22 = 9.68');
    fireEvent.change(document.getElementById('gpa-credits-1'), { target: { value: '' } });
    fireEvent.click(screen.getByRole('button', { name: 'Calculate SGPA' }));
    expect(screen.getByRole('alert')).toHaveTextContent('Please enter valid positive credits for course #2.');
    expect(apiRequest.mock.calls.some((c) => c[0] === '/gpa/calculate-sgpa')).toBe(false);
  });

  it('Save to History posts semester and courses', async () => {
    render(<GpaCalculatorView />);
    await screen.findByText('SGPA = 213.0 / 22 = 9.68');
    fireEvent.click(screen.getByRole('button', { name: 'Save to History' }));
    await waitFor(() => expect(screen.getByText('saved')).toBeInTheDocument());
    const call = apiRequest.mock.calls.find((c) => c[0] === '/gpa/save-semester');
    expect(JSON.parse(call[1].body).semester).toBe(6);
  });

  it('Compute CGPA posts the semester rows', async () => {
    render(<GpaCalculatorView />);
    fireEvent.click(screen.getByRole('button', { name: 'CGPA' }));
    fireEvent.click(screen.getByRole('button', { name: 'Compute Cumulative CGPA' }));
    expect(await screen.findByText('CGPA = server')).toBeInTheDocument();
    const call = apiRequest.mock.calls.find((c) => c[0] === '/gpa/calculate-cgpa');
    expect(JSON.parse(call[1].body).semesters[5]).toEqual({ semester: 6, credits: 22, sgpa: 9.68 });
  });

  it('history tab: cards, breakdown dialog (Escape closes), load and delete', async () => {
    history = hist;
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    render(<GpaCalculatorView />);
    fireEvent.click(await screen.findByRole('button', { name: 'History (1)' }));
    expect(screen.getByText('Semester 5')).toBeInTheDocument();
    expect(screen.getByText('SGPA 9.5')).toBeInTheDocument();
    expect(document.querySelector('table')).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'View Breakdown' }));
    const dlg = screen.getByRole('dialog');
    expect(within(dlg).getByText('Networks')).toBeInTheDocument();
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('dialog')).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'Delete' }));
    await waitFor(() => expect(apiRequest).toHaveBeenCalledWith('/gpa/history/11', { method: 'DELETE' }));

    fireEvent.click(screen.getByRole('button', { name: 'Load into Calculator' }));
    expect(screen.getByText('Loaded saved Semester 5 records into form.')).toBeInTheDocument();
    expect(screen.getByLabelText('Subject 1')).toHaveValue('Networks');
  });

  it('history load failure shows ErrorCard and retry refetches', async () => {
    apiRequest.mockRejectedValueOnce(new NetworkError('down'));
    render(<GpaCalculatorView />);
    expect(await screen.findByText("Can't reach the server")).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
    await waitFor(() => expect(screen.queryByText("Can't reach the server")).toBeNull());
    expect(screen.getByRole('button', { name: 'SGPA' })).toHaveAttribute('aria-pressed', 'true');
  });
});
