import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { render, screen, fireEvent, cleanup, act, waitFor, within } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { signIn, ALEX } from './signed-in.js';

vi.mock('../src/screens/index.js', () => {
  const stub = (name) => () => <div>{name} stub</div>;
  const ids = ['dashboard','academics','attendance','attendance_calc','timetable','assignments','notes','examinations','gpa_calc','profile','placements','projects','events','library','services','notifications','analytics','doubts','faculty_mentor','fees','assistant','admin'];
  return { default: Object.fromEntries(ids.map((i) => [i, stub(i)])) };
});

vi.mock('../src/auth-api', async () => {
  const actual = await vi.importActual('../src/auth-api');
  return {
    ...actual,
    authApi: {
      config: vi.fn().mockResolvedValue({ google: true, email: true }),
      me: vi.fn(),
      login: vi.fn(),
      exchangeGoogle: vi.fn(),
      logoutAll: vi.fn().mockResolvedValue({}),
    },
  };
});

import { authApi } from '../src/auth-api';
import { UNAUTHORIZED_EVENT } from '../src/api';
import App from '../src/App.jsx';

beforeEach(() => {
  localStorage.clear();
  authApi.me.mockReset().mockResolvedValue({ user: ALEX });
});
afterEach(() => { cleanup(); window.history.replaceState(null, '', '/'); });

describe('App auth', () => {
  it('shows sign-in when there is no stored session', () => {
    render(<App />);
    expect(screen.getByRole('heading', { name: 'Welcome back' })).toBeInTheDocument();
  });

  it('401 redirects and returns to screen', async () => {
    signIn();
    authApi.login.mockResolvedValue({ token: 'new', user: ALEX });
    render(<App />);
    const tabs = screen.getByRole('navigation', { name: 'Primary' });
    fireEvent.click(within(tabs).getByRole('button', { name: 'Timetable' }));
    expect(screen.getByText('timetable stub')).toBeInTheDocument();
    act(() => { window.dispatchEvent(new CustomEvent(UNAUTHORIZED_EVENT)); });
    expect(screen.getByRole('alert')).toHaveTextContent('Your session ended');
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'student@college.edu' } });
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'student123' } });
    fireEvent.click(screen.getByRole('button', { name: 'Sign in' }));
    expect(await screen.findByText('timetable stub')).toBeInTheDocument();
    expect(localStorage.getItem('auth_token')).toBe('new');
  });

  it('exchanges the Google return code from the URL hash', async () => {
    window.history.replaceState(null, '', '/#/auth-return?code=' + 'a'.repeat(64));
    authApi.exchangeGoogle.mockResolvedValue({ token: 'g', user: ALEX });
    render(<App />);
    expect(await screen.findByText('dashboard stub')).toBeInTheDocument();
    expect(authApi.exchangeGoogle).toHaveBeenCalledWith('a'.repeat(64));
    expect(window.location.hash).toBe('');
  });

  it('shows a Google error from the return URL', async () => {
    window.history.replaceState(null, '', '/#/auth-return?error=not_registered');
    render(<App />);
    expect(await screen.findByRole('alert')).toHaveTextContent("isn't registered with MSEC");
  });

  it('log out everywhere revokes then signs out', async () => {
    signIn();
    render(<App />);
    const tabs = screen.getByRole('navigation', { name: 'Primary' });
    fireEvent.click(within(tabs).getByRole('button', { name: 'More' }));
    fireEvent.click(screen.getByRole('button', { name: 'Log out everywhere' }));
    await waitFor(() => expect(authApi.logoutAll).toHaveBeenCalled());
    expect(await screen.findByRole('heading', { name: 'Welcome back' })).toBeInTheDocument();
    expect(localStorage.getItem('auth_token')).toBeNull();
  });

  it('admin sees the roster row in More', () => {
    signIn({ ...ALEX, role: 'admin' });
    authApi.me.mockResolvedValue({ user: { ...ALEX, role: 'admin' } });
    render(<App />);
    const tabs = screen.getByRole('navigation', { name: 'Primary' });
    fireEvent.click(within(tabs).getByRole('button', { name: 'More' }));
    expect(screen.getByRole('button', { name: /Admin: Roster/ })).toBeInTheDocument();
  });
});
