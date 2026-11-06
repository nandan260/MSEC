import React, { useState } from 'react';
import { downloadCard } from '../../assistant-api';

const clampPct = (n) => Math.max(0, Math.min(100, Number(n) || 0));

function StatCard({ card }) {
  const pct = card.unit === '%';
  const value = pct ? clampPct(card.value) : Number(card.value) || 0;
  const low = card.threshold != null && value < card.threshold;
  return (
    <div className="ai-stat">
      <div className="ai-stat__row">
        <span>{card.label}</span>
        <span className={`ai-stat__value${low ? ' is-low' : ''}`}>
          {pct ? `${Math.round(value)}%` : value}
        </span>
      </div>
      {pct && (
        <div className="ai-stat__track">
          <div data-testid="stat-fill" className={`ai-stat__fill${low ? ' is-low' : ''}`} style={{ width: `${value}%` }} />
          {card.threshold != null && (
            <div data-testid="stat-marker" className="ai-stat__marker" style={{ left: `${clampPct(card.threshold)}%` }} />
          )}
        </div>
      )}
      {card.note && <p className="ai-card__note">{card.note}</p>}
    </div>
  );
}

function ListCard({ card }) {
  return (
    <ul className="ai-list">
      {card.items.map((item, i) => (
        <li key={i} className="ai-list__item">
          <div className="ai-list__text">
            <span className="ai-list__primary">{item.primary}</span>
            {item.secondary && <span className="ai-list__secondary">{item.secondary}</span>}
          </div>
          {item.meta && <span className="ai-list__meta">{item.meta}</span>}
        </li>
      ))}
      {!card.items.length && <li className="ai-list__empty">Nothing to show.</li>}
    </ul>
  );
}

function StudyCard({ card }) {
  return (
    <>
      <span className={`ai-chip-tag${card.source === 'notes' ? ' is-notes' : ''}`}>
        {card.source === 'notes' ? 'From your notes' : 'General knowledge'}
      </span>
      {card.summary && <p>{card.summary}</p>}
      {card.sections.map((s, i) => (
        <div key={i} className="ai-section">
          <h4>{s.title}</h4>
          <p>{s.body}</p>
        </div>
      ))}
      {!!card.slides.length && (
        <details className="ai-details">
          <summary>Slides ({card.slides.length})</summary>
          {card.slides.map((slide, i) => (
            <div key={i} className="ai-section">
              <h4>{slide.title}</h4>
              <ul>{slide.bullets.map((b, j) => <li key={j}>{b}</li>)}</ul>
            </div>
          ))}
        </details>
      )}
      {card.quiz?.map((q, i) => (
        <details key={i} className="ai-details">
          <summary>{q.question}</summary>
          <p>{q.answer}</p>
        </details>
      ))}
    </>
  );
}

function ReportCard({ card }) {
  return (
    <div className="ai-table" tabIndex={0} role="region" aria-label={`${card.title} records`}>
      <table>
        <thead><tr>{card.columns.map((c) => <th key={c}>{c}</th>)}</tr></thead>
        <tbody>
          {card.rows.map((row, i) => (
            <tr key={i}>{card.columns.map((c) => <td key={c}>{row[c]}</td>)}</tr>
          ))}
        </tbody>
      </table>
      {!card.rows.length && <p className="ai-list__empty">No records.</p>}
    </div>
  );
}

const FORMATS = { study: ['pptx', 'pdf'], report: ['pdf'] };
const BODY = { stat: StatCard, list: ListCard, study: StudyCard, report: ReportCard };

export function AssistantCard({ card, offline }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const Body = BODY[card.kind];
  if (!Body) return null;

  async function download(format) {
    if (busy || offline) return;
    setBusy(true);
    setError('');
    try {
      await downloadCard(card, format);
    } catch (err) {
      setError(err.message || 'Download failed.');
    } finally {
      setBusy(false);
    }
  }

  const formats = FORMATS[card.kind] || [];
  return (
    <section className={`ai-card ai-card--${card.kind}`} role="group" aria-label={card.title}>
      {card.kind !== 'stat' && <h3 className="ai-card__title">{card.title}</h3>}
      <Body card={card} />
      {!!formats.length && (
        <div className="ai-card__actions">
          {formats.map((f) => (
            <button key={f} type="button" className="ai-btn" disabled={busy || offline} onClick={() => download(f)}>
              Download {f.toUpperCase()}
            </button>
          ))}
        </div>
      )}
      {error && <p className="ai-card__error" role="alert">{error}</p>}
    </section>
  );
}
