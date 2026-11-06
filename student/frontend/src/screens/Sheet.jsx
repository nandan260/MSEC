import React, { useEffect, useRef } from 'react';
import './shared.css';

// Bottom-sheet dialog: Escape closes it and focus moves to the first field on open.
export default function Sheet({ label, title, onClose, onSubmit, children }) {
  const ref = useRef(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  useEffect(() => {
    ref.current?.querySelector('input,select,textarea,button')?.focus();
    const onKey = (e) => {
      if (e.key === 'Escape') closeRef.current();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  const Tag = onSubmit ? 'form' : 'div';
  return (
    <div className="sheet-scrim" role="dialog" aria-modal="true" aria-label={label || title}>
      <Tag ref={ref} className="card sheet" onSubmit={onSubmit}>
        <h2 className="section-title">{title}</h2>
        {children}
      </Tag>
    </div>
  );
}
