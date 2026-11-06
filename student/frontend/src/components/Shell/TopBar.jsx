import React from 'react';
import { Icon } from './icons';

export function initials(user) {
  const name = (user && user.name) || '';
  const letters = name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join('');
  return letters || 'S';
}

function firstName(user) {
  const name = (user && user.name) || '';
  return name.split(/\s+/).filter(Boolean)[0] || 'there';
}

const TZ = 'Asia/Kolkata';

// "Friday, 6 Nov" in college time.
export function dayLine(now) {
  const weekday = now.toLocaleDateString('en-GB', { weekday: 'long', timeZone: TZ });
  const rest = now.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', timeZone: TZ });
  return `${weekday}, ${rest}`;
}

// Large-title screen header from the mobile design.
// variant: 'home' (greeting, bell, avatar), 'ai' (spark badge), 'page' (title, optional back).
export default function TopBar({
  variant = 'page', title, kicker, onBack, onBell, onAvatar, user, unread = false, now = new Date(),
}) {
  if (variant === 'home') {
    return (
      <header className="screen-head screen-head--home">
        <div className="screen-head__text">
          <div className="screen-head__kicker">{dayLine(now)}</div>
          <h1 className="screen-head__title">Hi, {firstName(user)}</h1>
        </div>
        <button type="button" className="circle-btn" aria-label="Notifications" onClick={onBell}>
          <Icon name="bell" size={20} />
          {unread && <span className="notif-dot" data-testid="notif-dot" aria-hidden="true" />}
        </button>
        <button type="button" className="avatar-btn" aria-label="Profile" onClick={onAvatar}>
          {initials(user)}
        </button>
      </header>
    );
  }
  return (
    <header className={`screen-head screen-head--${variant}`}>
      {onBack && (
        <button type="button" className="circle-btn" aria-label="Back" onClick={onBack}>
          <Icon name="back" size={20} stroke={2} />
        </button>
      )}
      {variant === 'ai' && (
        <span className="screen-head__badge" aria-hidden="true"><Icon name="sparkle" size={22} /></span>
      )}
      <div className="screen-head__text">
        {kicker && <div className="screen-head__kicker">{kicker}</div>}
        <h1 className="screen-head__title">{title}</h1>
      </div>
    </header>
  );
}
