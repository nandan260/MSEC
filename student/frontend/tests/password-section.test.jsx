import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { render, screen, fireEvent, cleanup, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { signIn, ALEX } from './signed-in.js';

vi.mock('../src/auth-api', () => ({ authApi: { setPassword: vi.fn() } }));
import { authApi } from '../src/auth-api';
import PasswordSection from '../src/components/PasswordSection.jsx';

beforeEach(() => { localStorage.clear(); authApi.setPassword.mockReset(); });
afterEach(cleanup);

describe('PasswordSection', () => {
  it('sets a first password without asking for the current one', async () => {
    signIn({ ...ALEX, has_password: false });
    authApi.setPassword.mockResolvedValue({});
    render(<PasswordSection />);
    expect(screen.queryByLabelText('Current password')).toBeNull();
    fireEvent.change(screen.getByLabelText('Password', { selector: 'input' }), { target: { value: 'brand-new-pass' } });
    fireEvent.click(screen.getByRole('button', { name: 'Set password' }));
    expect(await screen.findByRole('status')).toHaveTextContent('Password saved.');
    expect(authApi.setPassword).toHaveBeenCalledWith('', 'brand-new-pass');
    expect(screen.getByLabelText('Current password')).toBeInTheDocument();
  });

  it('change requires current and reports errors', async () => {
    signIn();
    authApi.setPassword.mockRejectedValue(new Error('Current password is wrong.'));
    render(<PasswordSection />);
    fireEvent.change(screen.getByLabelText('New password'), { target: { value: 'short' } });
    fireEvent.click(screen.getByRole('button', { name: 'Change password' }));
    expect(screen.getByRole('alert')).toHaveTextContent('Use at least 8 characters.');
    fireEvent.change(screen.getByLabelText('Current password'), { target: { value: 'old-pass-1' } });
    fireEvent.change(screen.getByLabelText('New password'), { target: { value: 'new-pass-22' } });
    fireEvent.click(screen.getByRole('button', { name: 'Change password' }));
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('Current password is wrong.'));
    expect(authApi.setPassword).toHaveBeenCalledWith('old-pass-1', 'new-pass-22');
  });
});
