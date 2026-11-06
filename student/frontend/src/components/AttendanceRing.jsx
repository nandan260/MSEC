import React from 'react';

export default function AttendanceRing({ value, large = false, label }) {
  const percent = Math.max(0, Math.min(100, Number(value) || 0));
  return (
    <div className={`attendance-ring${large ? ' attendance-ring--large' : ''}`}>
      <svg viewBox="0 0 168 168" aria-hidden="true">
        <circle cx="84" cy="84" r="72" className="attendance-ring__track" />
        <circle cx="84" cy="84" r="72" className="attendance-ring__fill" pathLength="100" strokeDasharray={`${percent} 100`} transform="rotate(-90 84 84)" />
      </svg>
      <div className="attendance-ring__text"><strong>{value}%</strong>{label && <span>{label}</span>}</div>
    </div>
  );
}
