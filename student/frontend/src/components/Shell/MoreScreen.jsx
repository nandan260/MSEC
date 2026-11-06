import React from 'react';
import { SCREENS, MORE_GROUPS } from '../../nav';
import { Icon } from './icons';

export default function MoreScreen({ onOpen, onLogout }) {
  return (
    <div className="more">
      {MORE_GROUPS.map((group) => (
        <section key={group.title} className="card more__group">
          <h2 className="section-title">{group.title}</h2>
          {group.ids.map((id) => (
            <button key={id} type="button" className="more__row" onClick={() => onOpen(id)}>
              <Icon name={SCREENS[id].icon} size={22} />
              <span className="more__label truncate">{SCREENS[id].label}</span>
              <Icon name="chevron" size={18} />
            </button>
          ))}
          {group.title === 'Account' && (
            <button type="button" className="more__row more__row--danger" onClick={onLogout}>
              <Icon name="logout" size={22} />
              <span className="more__label">Log out</span>
            </button>
          )}
        </section>
      ))}
    </div>
  );
}
