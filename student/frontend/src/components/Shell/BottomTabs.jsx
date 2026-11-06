import React from 'react';
import { SCREENS, TABS } from '../../nav';
import { Icon } from './icons';

const TAB_LABELS = { dashboard: 'Home', academics: 'Academics' };

export default function BottomTabs({ active, onSelect }) {
  return (
    <nav className="tabbar" aria-label="Primary">
      {TABS.map((id) => (
        <button
          key={id}
          type="button"
          className={`tabbar__tab${id === active ? ' is-active' : ''}`}
          aria-current={id === active ? 'page' : undefined}
          onClick={() => onSelect(id)}
        >
          <Icon name={SCREENS[id].icon} size={24} />
          <span>{TAB_LABELS[id] || SCREENS[id].label}</span>
        </button>
      ))}
    </nav>
  );
}
