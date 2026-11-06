import React, { useEffect, useRef, useState } from "react";
import { assistantRequest, downloadCard } from "../assistant-api";
import { SCREENS } from "../nav";
import "./assistant.css";

const SUGGESTIONS = [
  "What's my timetable today?",
  "Upcoming exams",
  "Which notes for CS602?",
  "Make attendance report PDF",
  "Explain Paxos as slides",
];

function AssistantCard({ card }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function download(format) {
    setBusy(true);
    setError("");
    try {
      await downloadCard(card, format);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="assistant-card" aria-label={card.title}>
      <h3>{card.title}</h3>
      {card.kind === "study" && (
        <>
          <p>{card.summary}</p>
          {card.sections.map((section, index) => (
            <div key={index}>
              <h4>{section.title}</h4>
              <p>{section.body}</p>
            </div>
          ))}
          <details>
            <summary>Slides ({card.slides.length})</summary>
            {card.slides.map((slide, index) => (
              <div key={index}>
                <h4>{slide.title}</h4>
                <ul>
                  {slide.bullets.map((bullet, i) => (
                    <li key={i}>{bullet}</li>
                  ))}
                </ul>
                {slide.notes && <p>{slide.notes}</p>}
              </div>
            ))}
          </details>
          {card.quiz?.map((quiz, index) => (
            <details key={index}>
              <summary>{quiz.question}</summary>
              <p>{quiz.answer}</p>
            </details>
          ))}
        </>
      )}
      {card.kind === "report" && (
        <div
          className="assistant-table"
          tabIndex={0}
          role="region"
          aria-label={`${card.title} records`}
        >
          <table>
            <thead>
              <tr>
                {card.columns.map((column) => (
                  <th key={column}>{column}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {card.rows.map((row, index) => (
                <tr key={index}>
                  {card.columns.map((column) => (
                    <td key={column}>{row[column]}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
          {!card.rows.length && <p>No records supplied.</p>}
        </div>
      )}
      <div className="assistant-buttons">
        {["pptx", "pdf"].map((format) => (
          <button
            type="button"
            key={format}
            disabled={busy}
            onClick={() => download(format)}
          >
            Download {format.toUpperCase()}
          </button>
        ))}
      </div>
      {error && <p role="alert">{error}</p>}
    </section>
  );
}

export default function AssistantScreen({ onNavigate }) {
  const [status, setStatus] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const end = useRef(null);
  useEffect(() => {
    let active = true;
    assistantRequest("status")
      .then((value) => {
        if (active) setStatus(value);
      })
      .catch((err) => {
        if (active) setError(err.message);
      });
    return () => {
      active = false;
    };
  }, []);
  useEffect(() => {
    end.current?.scrollIntoView?.({ block: "nearest" });
  }, [messages, busy]);
  async function send(event) {
    event.preventDefault();
    if (busy || !input.trim()) return;
    const userMessage = { role: "user", content: input.trim() };
    const history = [...messages, userMessage]
      .slice(-29)
      .map(({ role, content }) => ({ role, content: content.slice(0, 30000) }));
    setBusy(true);
    setError("");
    try {
      const result = await assistantRequest("chat", {
        messages: history,
        currentScreen: "assistant",
      });
      setMessages((previous) => [
        ...previous,
        userMessage,
        { role: "assistant", content: result.message, ...result },
      ]);
      setInput("");
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="student-assistant">
      <div
        className="assistant-transcript"
        role="log"
        aria-label="AI conversation"
        aria-live="polite"
      >
        <p className="assistant-intro">
          Ask about your college records, find an app screen, or study a topic.
        </p>
        {status?.configured === false && (
          <p role="status">
            AI is not configured. Ask your administrator to configure the AI
            server. Your draft stays here.
          </p>
        )}
        {status?.configured && (
          <p className="assistant-meta">Connected · {status.model}</p>
        )}
        {!messages.length && (
          <div className="assistant-suggestions">
            {SUGGESTIONS.map((prompt) => (
              <button
                key={prompt}
                type="button"
                onClick={() => setInput(prompt)}
              >
                {prompt}
              </button>
            ))}
          </div>
        )}
        {messages.map((message, index) => (
          <article
            key={index}
            className={`assistant-message assistant-message--${message.role}`}
          >
            <strong>{message.role === "user" ? "You" : "Ask AI"}</strong>
            <p>{message.content}</p>
            {!!message.trace?.length && (
              <p className="assistant-meta">
                Tools: {message.trace.join(", ")}
              </p>
            )}
            {message.warnings?.map((warning, i) => (
              <p key={i} className="assistant-warning">
                {warning}
              </p>
            ))}
            <div className="assistant-buttons">
              {message.actions
                ?.filter(
                  (action) =>
                    action.type === "navigate" &&
                    action.screen !== "more" &&
                    Object.hasOwn(SCREENS, action.screen),
                )
                .map((action, i) => (
                  <button
                    type="button"
                    key={i}
                    onClick={() => onNavigate?.(action.screen)}
                  >
                    {action.label}
                  </button>
                ))}
            </div>
            {message.cards?.map((card, i) => (
              <AssistantCard key={i} card={card} />
            ))}
          </article>
        ))}
        {busy && <p role="status">Thinking…</p>}
        <div ref={end} />
      </div>
      <form className="assistant-composer" onSubmit={send}>
        {error && <p role="alert">{error}</p>}
        <label htmlFor="assistant-input">Message Ask AI</label>
        <textarea
          id="assistant-input"
          rows={2}
          maxLength={30000}
          value={input}
          disabled={busy}
          onChange={(event) => setInput(event.target.value)}
          placeholder="Ask a question…"
        />
        <button
          type="submit"
          disabled={busy || !input.trim() || status?.configured === false}
        >
          {busy ? "Thinking…" : "Send"}
        </button>
      </form>
    </div>
  );
}
