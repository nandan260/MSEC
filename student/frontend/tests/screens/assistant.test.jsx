import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import AssistantScreen from '../../src/screens/AssistantScreen';
import { assistantRequest, downloadCard } from '../../src/assistant-api';

vi.mock('../../src/assistant-api', () => ({
  assistantRequest: vi.fn(),
  downloadCard: vi.fn(),
}));

function httpError(status, message = 'x') {
  const e = new Error(message);
  e.status = status;
  return e;
}

function reply(extra = {}) {
  return { message: 'ok', actions: [], cards: [], trace: [], warnings: [], ...extra };
}

let online = true;
beforeEach(() => {
  vi.resetAllMocks();
  online = true;
  vi.spyOn(window.navigator, 'onLine', 'get').mockImplementation(() => online);
  assistantRequest.mockImplementation(async (path) => (path === 'status' ? { configured: true, model: 'fake' } : reply()));
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); });

const composer = () => screen.getByLabelText('Message Ask AI');
const sendBtn = () => screen.getByRole('button', { name: 'Send' });
async function ask(text) {
  fireEvent.change(composer(), { target: { value: text } });
  fireEvent.click(sendBtn());
}

it('renders five chips when empty and a chip sends its question', async () => {
  render(<AssistantScreen />);
  const chips = within(screen.getByRole('group', { name: 'Try asking' })).getAllByRole('button');
  expect(chips.map((c) => c.textContent)).toEqual([
    "What's due this week?", 'SGPA needed for 9.5', 'Summarise ML notes', "Today's timetable", 'Make attendance report PDF',
  ]);
  fireEvent.click(chips[0]);
  await waitFor(() => expect(assistantRequest).toHaveBeenCalledWith('chat', {
    messages: [{ role: 'user', content: "What's due this week?" }], currentScreen: 'assistant',
  }));
  expect(await screen.findByText('ok')).toBeInTheDocument();
  expect(screen.queryByRole('group', { name: 'Try asking' })).toBeNull();
});

it('renders model text as plain text, never HTML', async () => {
  assistantRequest.mockImplementation(async (p) => (p === 'status' ? { configured: true } : reply({ message: '<img src=x onerror=alert(1)>' })));
  const { container } = render(<AssistantScreen />);
  await ask('hi');
  expect(await screen.findByText('<img src=x onerror=alert(1)>')).toBeInTheDocument();
  expect(container.querySelector('img')).toBeNull();
});

it('stat card shows value and threshold marker', async () => {
  assistantRequest.mockImplementation(async (p) => (p === 'status' ? { configured: true } : reply({
    message: 'Attend the next 6 classes.',
    cards: [{ kind: 'stat', title: 'Compiler Design', label: 'CS603', value: 71.7, unit: '%', threshold: 75 }],
  })));
  render(<AssistantScreen />);
  await ask('skip?');
  const card = await screen.findByRole('group', { name: 'Compiler Design' });
  expect(within(card).getByText('CS603')).toBeInTheDocument();
  expect(within(card).getByText('72%')).toBeInTheDocument();
  expect(within(card).getByTestId('stat-marker')).toHaveStyle({ left: '75%' });
  expect(within(card).getByTestId('stat-fill')).toHaveClass('is-low');
});

it('list card renders items', async () => {
  assistantRequest.mockImplementation(async (p) => (p === 'status' ? { configured: true } : reply({
    cards: [{ kind: 'list', title: 'Due this week', items: [{ primary: 'Raft Consensus', secondary: 'CS601', meta: 'Today' }] }],
  })));
  render(<AssistantScreen />);
  await ask('due?');
  const card = await screen.findByRole('group', { name: 'Due this week' });
  expect(within(card).getByText('Raft Consensus')).toBeInTheDocument();
  expect(within(card).getByText('Today')).toBeInTheDocument();
});

it('navigate action calls onNavigate with screen; unknown screens are dropped', async () => {
  const onNavigate = vi.fn();
  assistantRequest.mockImplementation(async (p) => (p === 'status' ? { configured: true } : reply({
    actions: [
      { type: 'navigate', screen: 'fees', label: 'Open Fees' },
      { type: 'navigate', screen: 'javascript:alert(1)', label: 'Bad' },
    ],
  })));
  render(<AssistantScreen onNavigate={onNavigate} />);
  await ask('fees?');
  fireEvent.click(await screen.findByRole('button', { name: 'Open Fees' }));
  expect(onNavigate).toHaveBeenCalledWith('fees');
  expect(screen.queryByRole('button', { name: 'Bad' })).toBeNull();
});

it('study card offers PPTX and PDF; report card offers PDF only', async () => {
  const study = { kind: 'study', title: 'Paxos', summary: 's', sections: [], slides: [{ title: 'Q', bullets: ['b'] }], source: 'general' };
  const report = { kind: 'report', title: 'Attendance report', report: 'attendance', columns: ['Course'], rows: [{ Course: 'CS601' }] };
  assistantRequest.mockImplementation(async (p) => (p === 'status' ? { configured: true } : reply({ cards: [study, report] })));
  downloadCard.mockResolvedValue();
  render(<AssistantScreen />);
  await ask('make');
  const s = await screen.findByRole('group', { name: 'Paxos' });
  const r = screen.getByRole('group', { name: 'Attendance report' });
  expect(within(s).getByText('General knowledge')).toBeInTheDocument();
  expect(within(s).getAllByRole('button').map((b) => b.textContent)).toEqual(['Download PPTX', 'Download PDF']);
  expect(within(r).getAllByRole('button').map((b) => b.textContent)).toEqual(['Download PDF']);
  fireEvent.click(within(r).getByRole('button', { name: 'Download PDF' }));
  await waitFor(() => expect(downloadCard).toHaveBeenCalledWith(report, 'pdf'));
});

it('export button disabled while pending and when offline', async () => {
  const report = { kind: 'report', title: 'R', report: 'exams', columns: ['A'], rows: [] };
  assistantRequest.mockImplementation(async (p) => (p === 'status' ? { configured: true } : reply({ cards: [report] })));
  let finish;
  downloadCard.mockImplementation(() => new Promise((r) => { finish = r; }));
  render(<AssistantScreen />);
  await ask('r');
  const btn = await screen.findByRole('button', { name: 'Download PDF' });
  fireEvent.click(btn);
  fireEvent.click(btn);
  expect(btn).toBeDisabled();
  expect(downloadCard).toHaveBeenCalledTimes(1);
  await act(async () => { finish(); });
  expect(btn).not.toBeDisabled();
  online = false;
  act(() => { window.dispatchEvent(new Event('offline')); });
  expect(btn).toBeDisabled();
});

it('503 shows setup message and keeps input', async () => {
  assistantRequest.mockImplementation(async (p) => { if (p === 'status') return { configured: true }; throw httpError(503); });
  render(<AssistantScreen />);
  await ask('timetable');
  expect(await screen.findByRole('alert')).toHaveTextContent('Assistant not set up. Start OmniRoute.');
  expect(composer()).toHaveValue('timetable');
});

it('status configured false shows setup message up front', async () => {
  assistantRequest.mockImplementation(async () => ({ configured: false, model: '' }));
  render(<AssistantScreen />);
  expect(await screen.findByRole('status')).toHaveTextContent('Assistant not set up. Start OmniRoute.');
});

it('502 shows retry; retry resends and succeeds', async () => {
  let calls = 0;
  assistantRequest.mockImplementation(async (p) => {
    if (p === 'status') return { configured: true };
    calls += 1;
    if (calls === 1) throw httpError(502);
    return reply({ message: 'second time' });
  });
  render(<AssistantScreen />);
  await ask('exams');
  expect(await screen.findByRole('alert')).toHaveTextContent("AI didn't respond.");
  fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
  expect(await screen.findByText('second time')).toBeInTheDocument();
  const chat = assistantRequest.mock.calls.filter(([p]) => p === 'chat');
  expect(chat[1][1].messages).toEqual([{ role: 'user', content: 'exams' }]);
});

it('sends at most 30 messages', async () => {
  render(<AssistantScreen />);
  for (let i = 0; i < 17; i += 1) {
    await ask(`q${i}`);
    await screen.findAllByText('ok');
    await waitFor(() => expect(composer()).toHaveValue(''));
  }
  const last = assistantRequest.mock.calls.filter(([p]) => p === 'chat').at(-1)[1].messages;
  expect(last.length).toBeLessThanOrEqual(30);
  expect(last.length).toBeGreaterThanOrEqual(29);
  expect(last.at(-1)).toEqual({ role: 'user', content: 'q16' });
  expect(last[0].role).toBe('user');
});

it('composer disabled offline', async () => {
  render(<AssistantScreen />);
  online = false;
  act(() => { window.dispatchEvent(new Event('offline')); });
  expect(composer()).toBeDisabled();
  expect(screen.getByText("You're offline. Ask AI needs a connection.")).toBeInTheDocument();
  online = true;
  act(() => { window.dispatchEvent(new Event('online')); });
  expect(composer()).not.toBeDisabled();
});
