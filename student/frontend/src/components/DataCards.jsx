import React from 'react';
import './components.css';

const isEmptyValue = (v) => v === null || v === undefined || v === '';

export default function DataCards({
  rows,
  title,
  value,
  meta,
  keyOf = (_row, index) => index,
  empty = 'Nothing here yet',
  onRowClick,
}) {
  if (!rows || rows.length === 0) {
    return <div className="empty-state">{empty}</div>;
  }

  const interactive = typeof onRowClick === 'function';

  const handleKeyDown = (row) => (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onRowClick(row);
    }
  };

  return (
    <div className="data-cards">
      {rows.map((row, index) => {
        const metaItems = (meta || [])
          .map((m) => ({ label: m.label, node: m.render(row) }))
          .filter((m) => !isEmptyValue(m.node));

        const interactiveProps = interactive
          ? {
              role: 'button',
              tabIndex: 0,
              onClick: () => onRowClick(row),
              onKeyDown: handleKeyDown(row),
            }
          : {};

        return (
          <div
            key={keyOf(row, index)}
            className={`card data-card${interactive ? ' data-card--button' : ''}`}
            {...interactiveProps}
          >
            <div className="card-row">
              <div className="truncate data-card-title">{title(row)}</div>
              {value && <div className="data-card-value">{value(row)}</div>}
            </div>
            {metaItems.length > 0 && (
              <dl className="data-card-meta">
                {metaItems.map((m) => (
                  <div key={m.label}>
                    <dt>{m.label}</dt>
                    <dd>{m.node}</dd>
                  </div>
                ))}
              </dl>
            )}
          </div>
        );
      })}
    </div>
  );
}
