import { beforeEach, afterEach, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { signIn } from './signed-in.js';

beforeEach(() => signIn());
import App from '../src/App.jsx';

vi.mock('../src/screens/index.js', () => ({ default: { dashboard: () => <div>Home records</div>, assistant: () => <div>Assistant conversation</div> } }));
afterEach(() => { cleanup(); vi.restoreAllMocks(); });

it('unknown destinations show 404 and recover to Home or Ask AI', () => {
  render(<App />);
  act(() => window.__msecNav.navigate('missing-page'));
  expect(screen.getByRole('heading', { name: 'Page not found' })).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Ask AI for help' }));
  expect(screen.getByText('Assistant conversation')).toBeInTheDocument();
  act(() => window.__msecNav.navigate('another-missing-page'));
  fireEvent.click(screen.getByRole('button', { name: 'Go to Home' }));
  expect(screen.getByText('Home records')).toBeInTheDocument();
});

it('offline state explains missing saved records and can retry', () => {
  vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false);
  render(<App />);
  expect(screen.getByRole('heading', { name: "You're offline" })).toBeInTheDocument();
  expect(screen.getByText('Connect to load your student records.')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Try again' })).toBeInTheDocument();
});
