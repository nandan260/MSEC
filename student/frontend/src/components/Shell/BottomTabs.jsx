import React from 'react';
import { SCREENS, TABS } from '../../nav';
import { Icon } from './icons';

const TAB_LABELS = { dashboard: 'Home', academics: 'Academics' };

// Floating pill bar: only the active tab shows its label.
export default function BottomTabs({ active, onSelect }) {
  return (
    <nav className="tabbar" aria-label="Primary">
      {TABS.map((id) => {
        const label = TAB_LABELS[id] || SCREENS[id].label;
        const on = id === active;
        return (
          <button
            key={id}
            type="button"
            className={`tabbar__tab${on ? ' is-active' : ''}`}
            aria-label={label}
            aria-current={on ? 'page' : undefined}
            onClick={() => onSelect(id)}
          >
            <Icon name={SCREENS[id].icon} size={on ? 20 : 22} stroke={on ? 2 : 1.8} />
            {on && <span aria-hidden="true">{label}</span>}
          </button>
        );
      })}
    </nav>
  );
}
