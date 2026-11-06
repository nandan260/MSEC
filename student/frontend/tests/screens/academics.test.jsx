import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup, within } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

vi.mock('../../src/api', async () => {
  class NetworkError extends Error {}
  return { apiRequest: vi.fn(), NetworkError };
});

import { apiRequest, NetworkError } from '../../src/api';
import AcademicPerformanceView from '../../src/screens/AcademicsScreen.jsx';

const perf = {
  selected_semester: 6,
  available_semesters: [5, 6],
  sgpa: 8.9,
  cgpa: 8.4,
  total_credits: 21,
  result_status: 'PASS',
  passed_subjects: 2,
  failed_subjects: 0,
  marks: [
    { id: 1, course_code: 'CS601', course_title: 'Compilers', credits: 4, internal_marks: 26, lab_marks: 18, external_marks: 40, total_marks: 84, grade: 'A+', status: 'Pass' },
    { id: 2, course_code: 'CS602', course_title: 'Networks', credits: 3, internal_marks: 10, lab_marks: 5, external_marks: 12, total_marks: 27, grade: 'F', status: 'Fail' },
  ],
};

beforeEach(() => apiRequest.mockReset());

describe('AcademicsScreen', () => {
  it('renders SGPA/CGPA tiles and one card per subject', async () => {
    apiRequest.mockResolvedValueOnce(perf);
    render(<AcademicPerformanceView userRole="student" />);
    expect(await screen.findByText('CS601: Compilers')).toBeInTheDocument();
    expect(screen.getByText('8.9')).toBeInTheDocument();
    expect(screen.getByText('8.4')).toBeInTheDocument();
    expect(screen.getByText('84 / 100')).toBeInTheDocument();
    expect(screen.getByText(/44 \/ 50/)).toBeInTheDocument();
    expect(screen.getByText('40 / 50')).toBeInTheDocument();
    expect(screen.getByText('A+')).toHaveClass('pill--info');
    expect(screen.getByText('Fail')).toHaveClass('pill--bad');
    expect(apiRequest).toHaveBeenCalledWith('/academics/performance?semester=6');
    expect(screen.queryByText('Edit Marks')).toBeNull();
  });

  it('reloads for the chosen semester', async () => {
    apiRequest.mockResolvedValueOnce(perf).mockResolvedValueOnce({ ...perf, selected_semester: 5, sgpa: 7.5 });
    render(<AcademicPerformanceView userRole="student" />);
    await screen.findByText('CS601: Compilers');
    fireEvent.change(screen.getByLabelText('Semester'), { target: { value: '5' } });
    await waitFor(() => expect(apiRequest).toHaveBeenCalledWith('/academics/performance?semester=5'));
    expect(await screen.findByText('7.5')).toBeInTheDocument();
  });

  it('shows ErrorCard and retries', async () => {
    apiRequest.mockRejectedValueOnce(new NetworkError('down')).mockResolvedValueOnce(perf);
    render(<AcademicPerformanceView userRole="student" />);
    expect(await screen.findByText("Can't reach the server")).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
    expect(await screen.findByText('CS601: Compilers')).toBeInTheDocument();
  });

  it('faculty can edit marks: preview grade and PUT payload', async () => {
    apiRequest.mockResolvedValueOnce(perf).mockResolvedValueOnce({ message: 'Marks updated' }).mockResolvedValue(perf);
    render(<AcademicPerformanceView userRole="faculty" />);
    await screen.findByText('CS601: Compilers');
    fireEvent.click(screen.getAllByRole('button', { name: 'Edit Marks' })[0]);
    const dialog = screen.getByRole('dialog');
    fireEvent.change(within(dialog).getByLabelText(/Semester End Exam/), { target: { value: '50' } });
    expect(within(dialog).getByText('94 / 100')).toBeInTheDocument();
    expect(within(dialog).getByText(/Projected grade O \(Pass\)/)).toBeInTheDocument();
    fireEvent.click(within(dialog).getByRole('button', { name: 'Save Updated Marks' }));
    await waitFor(() =>
      expect(apiRequest).toHaveBeenCalledWith('/academics/marks/1', {
        method: 'PUT',
        body: JSON.stringify({ internal_marks: 26, lab_marks: 18, external_marks: 50 }),
      }),
    );
    expect(await screen.findByText('Marks updated')).toBeInTheDocument();
  });
});
