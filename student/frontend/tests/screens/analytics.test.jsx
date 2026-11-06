import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { render, screen, fireEvent, cleanup, within } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';

afterEach(cleanup);

vi.mock('../../src/api', async () => {
  class NetworkError extends Error {}
  return { apiRequest: vi.fn(), NetworkError };
});

import { apiRequest, NetworkError } from '../../src/api';
import PerformanceAnalyticsView from '../../src/screens/PerformanceAnalyticsScreen.jsx';

const data = {
  current_sgpa: 9.68, cumulative_cgpa: 9.36, overall_attendance_pct: 82.5, overall_marks_avg: 88.2,
  academic_standing: 'Distinction',
  trend: { direction: 'Improvement', label: 'SGPA up 0.18' },
  student: { name: 'Alex Kumar', usn: '1MS22CS001', department: 'CSE', semester: 6, batch: '2022-26' },
  sgpa_history: [
    { semester: 1, credits: 20, grade_points: 190, sgpa: 9.5, cgpa: 9.5 },
    { semester: 2, credits: 20, grade_points: 183, sgpa: 9.15, cgpa: 9.32 },
    { semester: 3, credits: 22, grade_points: 198, sgpa: 9.0, cgpa: 9.2 },
  ],
  subject_attendance: [
    { code: 'CS601', subject: 'Distributed Systems', percentage: 90, attended_classes: 40, od_classes: 2, total_classes: 46 },
    { code: 'CS602', subject: 'Machine Learning', percentage: 80, attended_classes: 30, od_classes: 0, total_classes: 37 },
    { code: 'CS603', subject: 'Compiler Design', percentage: 60, attended_classes: 20, od_classes: 0, total_classes: 33 },
  ],
  subject_marks: [
    { code: 'CS601', subject: 'Distributed Systems', internal_marks: 28, lab_marks: 19, external_marks: 45, total_marks: 92, grade: 'O' },
  ],
  low_attendance_alerts: [{ code: 'CS603', subject: 'Compiler Design', percentage: 60, message: 'Attend 8 more classes' }],
  marks_improvement_alerts: [],
};

beforeEach(() => {
  apiRequest.mockReset();
  apiRequest.mockResolvedValue(data);
});

describe('PerformanceAnalyticsScreen', () => {
  it('renders stats, chart, attendance bars, marks cards and alerts', async () => {
    render(<PerformanceAnalyticsView />);
    expect(await screen.findByText('9.68')).toBeInTheDocument();
    expect(screen.getByText('9.36')).toBeInTheDocument();
    expect(screen.getByText('82.5%')).toHaveClass('analytics__tone--warn');
    expect(screen.getByText('IMPROVEMENT')).toBeInTheDocument();
    expect(screen.getByText('CS601: Distributed Systems', { selector: '.data-card-title' })).toBeInTheDocument();
    expect(screen.getByText('Attend 8 more classes')).toBeInTheDocument();
    expect(screen.getByText(/Outstanding performance across all enrolled/)).toBeInTheDocument();
    expect(document.querySelector('table')).toBeNull();
    // attendance bars use computed widths and status classes
    const fills = document.querySelectorAll('.analytics__fill');
    expect(fills[0]).toHaveClass('analytics__fill--good');
    expect(fills[1]).toHaveClass('analytics__fill--warn');
    expect(fills[2]).toHaveClass('analytics__fill--bad');
    expect(fills[2].style.width).toBe('60%');
  });

  it('chart stays inside its viewBox: every label x is within bounds and no hex colours are used', async () => {
    render(<PerformanceAnalyticsView />);
    await screen.findByText('9.68');
    const svg = document.querySelector('svg.analytics__svg');
    const [, , w] = svg.getAttribute('viewBox').split(' ').map(Number);
    const texts = [...svg.querySelectorAll('text')];
    expect(texts.length).toBeGreaterThan(8);
    for (const t of texts) {
      const x = Number(t.getAttribute('x'));
      // widest label ("10.0"/"9.50") is about 30px at 12px
      const anchor = t.getAttribute('text-anchor');
      const left = anchor === 'end' ? x - 30 : x - 15;
      const right = anchor === 'end' ? x : x + 15;
      expect(left).toBeGreaterThanOrEqual(0);
      expect(right).toBeLessThanOrEqual(w);
    }
    expect(svg.outerHTML).not.toMatch(/#[0-9a-fA-F]{3,6}\b/);
    expect(svg.outerHTML).not.toMatch(/\b(stroke|fill)="/);
  });

  it('report dialog shows cards, closes on Escape and prints', async () => {
    window.print = vi.fn();
    render(<PerformanceAnalyticsView />);
    fireEvent.click(await screen.findByRole('button', { name: 'Generate Academic Performance Report' }));
    const dlg = screen.getByRole('dialog');
    expect(within(dlg).getByText('1MS22CS001')).toBeInTheDocument();
    expect(within(dlg).getByText('Semester 2')).toBeInTheDocument();
    fireEvent.click(within(dlg).getByRole('button', { name: 'Print / Save PDF' }));
    expect(window.print).toHaveBeenCalled();
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('shows ErrorCard and retry refetches', async () => {
    apiRequest.mockRejectedValueOnce(new NetworkError('down'));
    render(<PerformanceAnalyticsView />);
    expect(await screen.findByText("Can't reach the server")).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
    expect(await screen.findByText('9.68')).toBeInTheDocument();
  });
});
