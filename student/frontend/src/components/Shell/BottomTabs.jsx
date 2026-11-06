import React, { useLayoutEffect, useRef, useState } from 'react';
import { SCREENS, TABS } from '../../nav';
import { Icon } from './icons';

const TAB_LABELS = { dashboard: 'Home', academics: 'Academics' };

// Floating pill bar: one indicator slides to the active tab; only the active tab shows its label.
export default function BottomTabs({ active, onSelect }) {
  const refs = useRef({});
  const [pill, setPill] = useState(null);

  useLayoutEffect(() => {
    const el = refs.current[active];
    if (!el) return undefined;
    const measure = () => setPill({ x: el.offsetLeft, w: el.offsetWidth });
    measure();
    if (typeof ResizeObserver === 'undefined') return undefined;
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [active]);

  return (
    <nav className="tabbar" aria-label="Primary">
      {pill && (
        <span
          className="tabbar__indicator"
          aria-hidden="true"
          style={{ transform: `translateX(${pill.x}px)`, width: `${pill.w}px` }}
        />
      )}
      {TABS.map((id) => {
        const label = TAB_LABELS[id] || SCREENS[id].label;
        const on = id === active;
        return (
          <button
            key={id}
            ref={(el) => { refs.current[id] = el; }}
            type="button"
            className={`tabbar__tab${on ? ' is-active' : ''}${on && !pill ? ' has-bg' : ''}`}
            aria-label={label}
            aria-current={on ? 'page' : undefined}
            onClick={() => onSelect(id)}
          >
            <Icon name={SCREENS[id].icon} size={on ? 20 : 22} stroke={on ? 2 : 1.8} />
            {on && <span className="tabbar__label" aria-hidden="true">{label}</span>}
          </button>
        );
      })}
    </nav>
  );
}
