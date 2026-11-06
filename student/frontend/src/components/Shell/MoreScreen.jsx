import React from 'react';
import { SCREENS, MORE_GROUPS } from '../../nav';
import { Icon } from './icons';
import { initials } from './TopBar';

export default function MoreScreen({ onOpen, onLogout, user }) {
  return (
    <div className="more">
      {user && <button type="button" className="more__profile" onClick={() => onOpen('profile')}>
        <span className="more__avatar">{initials(user)}</span>
        <span className="more__profile-text"><strong>{user.name}</strong><span>{user.identifier || user.usn} · {user.department === 'Computer Science & Engineering' ? 'CSE' : user.department} · Sem {user.semester}</span></span>
        <Icon name="chevron" size={18} />
      </button>}
      {MORE_GROUPS.map((group) => (
        <section key={group.title} className="more__group">
          <h2 className="section-title">{group.title}</h2>
          <div className="reference-list">
          {group.ids.map((id) => (
            <button key={id} type="button" className="more__row" onClick={() => onOpen(id)}>
              <span className="reference-icon"><Icon name={SCREENS[id].icon} size={18} /></span>
              <span className="more__label truncate">{SCREENS[id].label}</span>
              <Icon name="chevron" size={18} />
            </button>
          ))}
          {group.title === 'Account' && (
            <button type="button" className="more__row more__row--danger" onClick={onLogout}>
              <span className="reference-icon reference-icon--accent"><Icon name="logout" size={18} /></span>
              <span className="more__label">Log out</span>
            </button>
          )}
          </div>
        </section>
      ))}
    </div>
  );
}
