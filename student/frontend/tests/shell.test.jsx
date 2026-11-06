import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, within, cleanup, act } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';

afterEach(cleanup);

vi.mock('../src/screens/index.js', () => {
  const stub = (name) => () => <div>{name} stub</div>;
  const ids = ['dashboard','academics','attendance','attendance_calc','timetable','assignments','notes','examinations','gpa_calc','profile','placements','projects','events','library','services','notifications','analytics','doubts','faculty_mentor','fees','assistant'];
  return { default: Object.fromEntries(ids.map((i) => [i, stub(i)])) };
});

import BottomTabs from '../src/components/Shell/BottomTabs.jsx';
import MoreScreen from '../src/components/Shell/MoreScreen.jsx';
import TopBar from '../src/components/Shell/TopBar.jsx';
import App from '../src/App.jsx';

describe('BottomTabs', () => {
  it('renders 6 labelled tabs with the active one marked', () => {
    render(<BottomTabs active="attendance" onSelect={() => {}} />);
    const buttons = screen.getAllByRole('button');
    expect(buttons.map((b) => b.getAttribute('aria-label'))).toEqual(['Home', 'Attendance', 'Ask AI', 'Academics', 'Timetable', 'More']);
    expect(buttons[1]).toHaveAttribute('aria-current', 'page');
    expect(buttons[0]).not.toHaveAttribute('aria-current');
  });

  it('shows the label only on the active pill', () => {
    render(<BottomTabs active="attendance" onSelect={() => {}} />);
    const buttons = screen.getAllByRole('button');
    expect(buttons[1].textContent).toBe('Attendance');
    expect(buttons.filter((b, i) => i !== 1).every((b) => b.textContent === '')).toBe(true);
  });
});

describe('BottomTabs motion', () => {
  it('renders one sliding indicator that follows the active tab', () => {
    const { container, rerender } = render(<BottomTabs active="dashboard" onSelect={() => {}} />);
    const ind = container.querySelectorAll('.tabbar__indicator');
    expect(ind).toHaveLength(1);
    expect(ind[0]).toHaveAttribute('aria-hidden', 'true');
    rerender(<BottomTabs active="assistant" onSelect={() => {}} />);
    expect(container.querySelectorAll('.tabbar__indicator')).toHaveLength(1);
    expect(screen.getByRole('button', { name: 'Ask AI' })).toHaveAttribute('aria-current', 'page');
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
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Hi, Alex');
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
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Hi, Alex');
    act(() => { exit = window.__msecNav.goBack(); });
    expect(exit).toBe(true);
  });

  it('bell opens Notifications and avatar opens Profile', () => {
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: 'Notifications' }));
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Notifications');
    fireEvent.click(screen.getByRole('button', { name: 'Back' }));
    fireEvent.click(screen.getByRole('button', { name: 'Profile' }));
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Student Profile');
  });

  it('logout resets history so back exits', () => {
    render(<App />);
    const tabs = screen.getByRole('navigation', { name: 'Primary' });
    fireEvent.click(within(tabs).getByRole('button', { name: 'More' }));
    fireEvent.click(screen.getByRole('button', { name: /Log out/ }));
    expect(screen.queryByRole('navigation', { name: 'Primary' })).toBeNull();
    let exit;
    act(() => { exit = window.__msecNav.goBack(); });
    expect(exit).toBe(true);
  });
});

describe('TopBar', () => {
  it('home variant greets by first name with date; page variant shows back only when given', () => {
    const now = new Date('2026-11-06T06:00:00Z');
    const { rerender } = render(<TopBar variant="home" user={{ name: 'Alex Kumar' }} now={now} />);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Hi, Alex');
    expect(screen.getByText('Friday, 6 Nov')).toBeInTheDocument();
    rerender(<TopBar title="Library" />);
    expect(screen.queryByRole('button', { name: 'Back' })).toBeNull();
    rerender(<TopBar title="Library" onBack={() => {}} />);
    expect(screen.getByRole('button', { name: 'Back' })).toBeInTheDocument();
  });

  it('shows the notification dot only when unread is true', () => {
    const { rerender } = render(<TopBar variant="home" user={{ name: 'Alex Kumar' }} />);
    expect(screen.queryByTestId('notif-dot')).toBeNull();
    rerender(<TopBar variant="home" user={{ name: 'Alex Kumar' }} unread />);
    expect(screen.getByTestId('notif-dot')).toBeInTheDocument();
  });
});
