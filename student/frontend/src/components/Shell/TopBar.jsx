import React from 'react';
import { Icon } from './icons';

function initials(user) {
  const name = (user && user.name) || '';
  const letters = name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join('');
  return letters || 'S';
}

export default function TopBar({ title, onBell, onAvatar, user }) {
  return (
    <header className="topbar">
      <img className="topbar__logo" src="/favicon.svg" width="32" height="32" alt="MSEC" />
      <h1 className="topbar__title truncate">{title}</h1>
      <button type="button" className="topbar__btn" aria-label="Notifications" onClick={onBell}>
        <Icon name="bell" size={22} />
      </button>
      <button type="button" className="topbar__avatar" aria-label="Profile" onClick={onAvatar}>
        {initials(user)}
      </button>
    </header>
  );
}
