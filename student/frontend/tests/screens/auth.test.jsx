import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup, act } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';

vi.mock('../../src/auth-api', async () => {
  const actual = await vi.importActual('../../src/auth-api');
  return {
    ...actual,
    authApi: {
      config: vi.fn(),
      login: vi.fn(),
      requestCode: vi.fn(),
      verifyCode: vi.fn(),
      resetPassword: vi.fn(),
    },
    saveSession: vi.fn((s) => s.user),
    googleStartUrl: vi.fn(() => '/api/auth/google/start?platform=web'),
  };
});

import { authApi, saveSession } from '../../src/auth-api';
import AuthScreen from '../../src/screens/AuthScreen.jsx';

const USER = { id: 1, name: 'Alex', role: 'student' };
beforeEach(() => {
  vi.clearAllMocks();
  authApi.config.mockResolvedValue({ google: true, email: true });
});
afterEach(cleanup);

const email = () => screen.getByLabelText('Email');
const type = (el, value) => fireEvent.change(el, { target: { value } });

describe('AuthScreen', () => {
  it('matches the reference layout', async () => {
    render(<AuthScreen onLoginSuccess={() => {}} />);
    expect(screen.getByRole('heading', { name: 'Welcome back' })).toBeInTheDocument();
    expect(screen.getByText('Sign in to continue to MSEC.')).toBeInTheDocument();
    expect(await screen.findByRole('button', { name: 'Continue with Google' })).toBeInTheDocument();
    expect(screen.getByText('OR')).toBeInTheDocument();
    expect(email()).toBeInTheDocument();
    expect(screen.getByLabelText('Password')).toHaveAttribute('type', 'password');
    expect(screen.getByLabelText('Remember me')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Forgot password?' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Sign in' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Sign in with a code instead' })).toBeInTheDocument();
    expect(screen.getByText(/Use the Gmail your college registered/)).toBeInTheDocument();
    expect(screen.queryByText(/GitHub/i)).toBeNull();
  });

  it('eye button toggles password visibility', () => {
    render(<AuthScreen onLoginSuccess={() => {}} />);
    fireEvent.click(screen.getByRole('button', { name: 'Show password' }));
    expect(screen.getByLabelText('Password')).toHaveAttribute('type', 'text');
  });

  it('hides google when config false', async () => {
    authApi.config.mockResolvedValue({ google: false, email: false });
    render(<AuthScreen onLoginSuccess={() => {}} />);
    await waitFor(() => expect(authApi.config).toHaveBeenCalled());
    await waitFor(() => expect(screen.queryByRole('button', { name: 'Continue with Google' })).toBeNull());
    expect(screen.queryByRole('button', { name: 'Sign in with a code instead' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Forgot password?' })).toBeNull();
  });

  it('password sign in with remember me', async () => {
    authApi.login.mockResolvedValue({ token: 't', user: USER });
    const done = vi.fn();
    render(<AuthScreen onLoginSuccess={done} />);
    type(email(), 'alex@gmail.com');
    type(screen.getByLabelText('Password'), 'secret-pass');
    fireEvent.click(screen.getByLabelText('Remember me'));
    fireEvent.click(screen.getByRole('button', { name: 'Sign in' }));
    await waitFor(() => expect(done).toHaveBeenCalledWith(USER));
    expect(authApi.login).toHaveBeenCalledWith('alex@gmail.com', 'secret-pass', true);
    expect(saveSession).toHaveBeenCalled();
  });

  it('keeps email on error', async () => {
    authApi.login.mockRejectedValue(Object.assign(new Error('Invalid email or password.'), { status: 401 }));
    render(<AuthScreen onLoginSuccess={() => {}} />);
    type(email(), 'alex@gmail.com');
    type(screen.getByLabelText('Password'), 'wrong-pass');
    fireEvent.click(screen.getByRole('button', { name: 'Sign in' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Invalid email or password.');
    expect(email()).toHaveValue('alex@gmail.com');
  });

  it('no_password error offers the code flow', async () => {
    authApi.login.mockRejectedValue(Object.assign(new Error('No password set.'), { status: 409, code: 'no_password' }));
    render(<AuthScreen onLoginSuccess={() => {}} />);
    type(email(), 'alex@gmail.com');
    type(screen.getByLabelText('Password'), 'whatever1');
    fireEvent.click(screen.getByRole('button', { name: 'Sign in' }));
    await screen.findByRole('alert');
    fireEvent.click(screen.getByRole('button', { name: 'Send me a code' }));
    expect(await screen.findByRole('button', { name: 'Send code' })).toBeInTheDocument();
    expect(email()).toHaveValue('alex@gmail.com');
  });

  it('code mode: send code, verify, resend after 60s', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    authApi.requestCode.mockResolvedValue({ message: 'If this email is registered, a code was sent.' });
    authApi.verifyCode.mockResolvedValue({ token: 't', user: USER });
    const done = vi.fn();
    render(<AuthScreen onLoginSuccess={done} />);
    fireEvent.click(await screen.findByRole('button', { name: 'Sign in with a code instead' }));
    expect(screen.queryByLabelText('Password')).toBeNull();
    type(email(), 'alex@gmail.com');
    fireEvent.click(screen.getByRole('button', { name: 'Send code' }));
    expect(await screen.findByText('If this email is registered, a code was sent.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Resend/ })).toBeDisabled();
    type(screen.getByLabelText('6-digit code'), '12a3456');
    expect(screen.getByLabelText('6-digit code')).toHaveValue('123456');
    fireEvent.click(screen.getByRole('button', { name: 'Verify' }));
    await waitFor(() => expect(done).toHaveBeenCalledWith(USER));
    expect(authApi.verifyCode).toHaveBeenCalledWith('alex@gmail.com', '123456', false);
    await act(async () => { vi.advanceTimersByTime(61000); });
    expect(screen.getByRole('button', { name: 'Resend code' })).not.toBeDisabled();
    vi.useRealTimers();
  });

  it('forgot mode: code then new password', async () => {
    authApi.requestCode.mockResolvedValue({ message: 'If this email is registered, a code was sent.' });
    authApi.resetPassword.mockResolvedValue({ token: 't', user: USER });
    const done = vi.fn();
    render(<AuthScreen onLoginSuccess={done} />);
    type(email(), 'alex@gmail.com');
    fireEvent.click(await screen.findByRole('button', { name: 'Forgot password?' }));
    expect(screen.getByRole('heading', { name: 'Reset your password' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Send code' }));
    await screen.findByLabelText('6-digit code');
    expect(authApi.requestCode).toHaveBeenCalledWith('alex@gmail.com', 'reset');
    type(screen.getByLabelText('6-digit code'), '654321');
    type(screen.getByLabelText('New password'), 'brand-new-pass');
    fireEvent.click(screen.getByRole('button', { name: 'Reset password' }));
    await waitFor(() => expect(done).toHaveBeenCalledWith(USER));
    expect(authApi.resetPassword).toHaveBeenCalledWith('alex@gmail.com', '654321', 'brand-new-pass');
  });

  it('back to sign in from code mode', async () => {
    render(<AuthScreen onLoginSuccess={() => {}} />);
    fireEvent.click(await screen.findByRole('button', { name: 'Sign in with a code instead' }));
    fireEvent.click(screen.getByRole('button', { name: 'Use password instead' }));
    expect(screen.getByLabelText('Password')).toBeInTheDocument();
  });

  it('shows an initial error passed by the app (Google return)', () => {
    render(<AuthScreen onLoginSuccess={() => {}} initialError="Google sign-in was cancelled." />);
    expect(screen.getByRole('alert')).toHaveTextContent('Google sign-in was cancelled.');
  });
});
