import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';

afterEach(cleanup);

vi.mock('../../src/api', () => ({
  apiRequest: vi.fn(),
  setToken: vi.fn(),
  setUser: vi.fn(),
}));

import { apiRequest, setToken, setUser } from '../../src/api';
import AuthScreen from '../../src/screens/AuthScreen.jsx';

describe('AuthScreen', () => {
  it('renders the branded sign-in form with a primary button', () => {
    render(<AuthScreen onLoginSuccess={() => {}} />);
    expect(document.querySelector('[data-qa="auth-screen"]')).toBeInTheDocument();
    expect(screen.getByText('MS Engineering College')).toBeInTheDocument();
    expect(screen.getByLabelText('Institutional Email')).toHaveValue('student@college.edu');
    expect(screen.getByLabelText('Password')).toBeInTheDocument();
    const submit = document.querySelector('button[type="submit"]');
    expect(submit).toHaveClass('btn-primary');
  });

  it('shows registration fields on the New Registration tab', () => {
    render(<AuthScreen onLoginSuccess={() => {}} />);
    fireEvent.click(screen.getByRole('tab', { name: 'New Registration' }));
    expect(screen.getByLabelText('Full Name')).toBeInTheDocument();
    expect(screen.getByLabelText('Current Semester')).toBeInTheDocument();
  });

  it('logs in and reports the user', async () => {
    apiRequest.mockResolvedValueOnce({ token: 't', user: { name: 'Alex' } });
    const onLoginSuccess = vi.fn();
    render(<AuthScreen onLoginSuccess={onLoginSuccess} />);
    fireEvent.submit(document.querySelector('form'));
    await waitFor(() => expect(onLoginSuccess).toHaveBeenCalledWith({ name: 'Alex' }));
    expect(setToken).toHaveBeenCalledWith('t');
    expect(setUser).toHaveBeenCalled();
  });

  it('shows the error message when login fails', async () => {
    apiRequest.mockRejectedValueOnce(new Error('Invalid credentials'));
    render(<AuthScreen onLoginSuccess={() => {}} />);
    fireEvent.submit(document.querySelector('form'));
    expect(await screen.findByRole('alert')).toHaveTextContent('Invalid credentials');
  });
});
