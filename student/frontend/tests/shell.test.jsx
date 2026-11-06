import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, within, cleanup, act } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';

afterEach(cleanup);

vi.mock('../src/screens/index.js', () => {
  const stub = (name) => () => <div>{name} stub</div>;
  const ids = ['dashboard','academics','attendance','attendance_calc','timetable','assignments','notes','examinations','gpa_calc','profile','placements','projects','events','library','services','notifications','analytics','doubts','faculty_mentor','fees'];
  return { default: Object.fromEntries(ids.map((i) => [i, stub(i)])) };
});

import BottomTabs from '../src/components/Shell/BottomTabs.jsx';
import MoreScreen from '../src/components/Shell/MoreScreen.jsx';
import App from '../src/App.jsx';

describe('BottomTabs', () => {
  it('renders 5 labelled tabs with the active one marked', () => {
    render(<BottomTabs active="attendance" onSelect={() => {}} />);
    const buttons = screen.getAllByRole('button');
    expect(buttons.map((b) => b.textContent)).toEqual(['Home', 'Attendance', 'Academics', 'Timetable', 'More']);
    expect(buttons[1]).toHaveAttribute('aria-current', 'page');
    expect(buttons[0]).not.toHaveAttribute('aria-current');
  });
});

describe('MoreScreen', () => {
  it('shows group headings, opens screens and logs out', () => {
    const onOpen = vi.fn();
    const onLogout = vi.fn();
    render(<MoreScreen onOpen={onOpen} onLogout={onLogout} />);
    for (const t of ['Study', 'Campus', 'Help', 'Account']) {
      expect(screen.getByText(t)).toBeInTheDocument();
    }
    fireEvent.click(screen.getByRole('button', { name: /Library/ }));
    expect(onOpen).toHaveBeenCalledWith('library');
    fireEvent.click(screen.getByRole('button', { name: /Log out/ }));
    expect(onLogout).toHaveBeenCalled();
  });
});

describe('App shell', () => {
  it('navigates via More and keeps More tab active', () => {
    render(<App />);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Dashboard');
    const tabs = screen.getByRole('navigation', { name: 'Primary' });
    fireEvent.click(within(tabs).getByRole('button', { name: 'More' }));
    fireEvent.click(screen.getByRole('button', { name: /Library/ }));
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Library');
    expect(within(tabs).getByRole('button', { name: 'More' })).toHaveAttribute('aria-current', 'page');
    let exit;
    act(() => { exit = window.__msecNav.goBack(); });
    expect(exit).toBe(false);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('More');
    act(() => { exit = window.__msecNav.goBack(); });
    expect(exit).toBe(false);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Dashboard');
    act(() => { exit = window.__msecNav.goBack(); });
    expect(exit).toBe(true);
  });
});
