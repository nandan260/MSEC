import React, { useEffect, useRef, useState } from 'react';
import { assistantRequest } from '../assistant-api';
import { SCREENS } from '../nav';
import { Icon } from '../components/Shell/icons';
import { AssistantCard } from './assistant/Cards';
import { useOnline } from '../useOnline';
import './assistant.css';

export const SUGGESTIONS = [
  "What's due this week?",
  'SGPA needed for 9.5',
  'Summarise ML notes',
  "Today's timetable",
  'Make attendance report PDF',
];

const MAX_MESSAGES = 30;
const SETUP = 'Assistant not set up. Start OmniRoute.';

// Last <=30 messages, starting on a user turn.
function window30(history) {
  const slice = history.slice(-MAX_MESSAGES);
  return slice[0] && slice[0].role === 'assistant' ? slice.slice(1) : slice;
}

function errorText(err) {
  if (err && err.status === 503) return SETUP;
  if (err && err.status === 502) return "AI didn't respond.";
  return (err && err.message) || 'Something went wrong.';
}

function validActions(actions) {
  return (actions || []).filter((a) => a && a.type === 'navigate' && a.screen !== 'more' && Object.hasOwn(SCREENS, a.screen));
}

export default function AssistantScreen({ onNavigate }) {
  const online = useOnline();
  const [configured, setConfigured] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [pending, setPending] = useState(null);
  const [error, setError] = useState(null);
  const end = useRef(null);

  useEffect(() => {
    let live = true;
    assistantRequest('status')
      .then((s) => { if (live) setConfigured(!!(s && s.configured)); })
      .catch(() => { if (live) setConfigured(null); });
    return () => { live = false; };
  }, []);

  useEffect(() => {
    end.current?.scrollIntoView?.({ block: 'nearest' });
  }, [messages, pending]);

  async function send(text) {
    const content = text.trim();
    if (!content || pending || !online) return;
    const userMessage = { role: 'user', content };
    const history = window30([...messages, userMessage].map(({ role, content: c }) => ({ role, content: c })));
    setPending(content);
    setError(null);
    setInput(content);
    try {
      const result = await assistantRequest('chat', { messages: history, currentScreen: 'assistant' });
      setMessages((prev) => [...prev, userMessage, {
        role: 'assistant',
        content: result.message || '',
        actions: validActions(result.actions),
        cards: Array.isArray(result.cards) ? result.cards : [],
        trace: Array.isArray(result.trace) ? result.trace : [],
        warnings: Array.isArray(result.warnings) ? result.warnings : [],
      }]);
      setInput('');
    } catch (err) {
      setError({ text: errorText(err), retry: err && err.status === 502, content });
    } finally {
      setPending(null);
    }
  }

  const empty = !messages.length && !pending;
  const disabled = !online || !!pending;

  return (
    <div className="ai">
      <div className="ai__log" role="log" aria-label="AI conversation" aria-live="polite">
        {configured === false && <p className="ai-banner" role="status">{SETUP}</p>}

        {messages.map((m, i) => (m.role === 'user' ? (
          <p key={i} className="ai-bubble ai-bubble--user">{m.content}</p>
        ) : (
          <article key={i} className="ai-bubble ai-bubble--bot">
            {m.content && <p className="ai-text">{m.content}</p>}
            {m.cards.map((card, j) => <AssistantCard key={j} card={card} offline={!online} />)}
            {!!m.actions.length && (
              <div className="ai-actions">
                {m.actions.map((a, j) => (
                  <button key={j} type="button" className="ai-btn ai-btn--nav" onClick={() => onNavigate?.(a.screen)}>
                    {a.label}
                  </button>
                ))}
              </div>
            )}
            {m.warnings.map((w, j) => <p key={j} className="ai-warn">{w}</p>)}
            {!!m.trace.length && <p className="ai-trace">Checked: {m.trace.join(', ')}</p>}
          </article>
        )))}

        {pending && (
          <>
            <p className="ai-bubble ai-bubble--user">{pending}</p>
            <p className="ai-bubble ai-bubble--bot ai-typing" role="status">Thinking…</p>
          </>
        )}

        {error && (
          <div className="ai-banner ai-banner--error" role="alert">
            <span>{error.text}</span>
            {error.retry && (
              <button type="button" className="ai-btn" onClick={() => send(error.content)}>Retry</button>
            )}
          </div>
        )}

        {empty && (
          <div className="ai-try">
            <div className="ai-try__label" id="ai-try-label">Try asking</div>
            <div className="ai-try__chips" role="group" aria-labelledby="ai-try-label">
              {SUGGESTIONS.map((q) => (
                <button key={q} type="button" className="ai-chip" disabled={disabled} onClick={() => send(q)}>{q}</button>
              ))}
            </div>
          </div>
        )}
        <div ref={end} />
      </div>

      <form className="ai-composer" onSubmit={(e) => { e.preventDefault(); send(input); }}>
        {!online && <p className="ai-offline">You're offline. Ask AI needs a connection.</p>}
        <div className="ai-composer__box">
          <label htmlFor="ai-input" className="visually-hidden">Message Ask AI</label>
          <input
            id="ai-input"
            className="ai-composer__input"
            maxLength={4000}
            value={input}
            disabled={disabled}
            autoComplete="off"
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask anything…"
          />
          <button type="submit" className="ai-send" aria-label="Send" disabled={disabled || !input.trim()}>
            <Icon name="send" size={20} stroke={2.2} />
          </button>
        </div>
      </form>
    </div>
  );
}
