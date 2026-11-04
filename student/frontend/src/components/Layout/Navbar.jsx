import React from 'react';

export default function Navbar({ user, activeTitle, onLogout, onToggleMobileMenu }) {
  return (
    <header className="topbar">
      <div className="topbar-left">
        <button
          type="button"
          className="mobile-menu-btn"
          onClick={onToggleMobileMenu}
        >
          Menu
        </button>
        <h2 className="page-title">{activeTitle || 'Dashboard'}</h2>
      </div>

      <div className="topbar-right">
        {user && (
          <div className="user-badge" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span className="user-role-tag">Student</span>
            <span className="user-name">{user.name} ({user.identifier})</span>
          </div>
        )}

        <button
          type="button"
          className="btn-secondary"
          style={{ padding: '5px 10px', fontSize: '12px', marginLeft: '8px' }}
          onClick={onLogout}
        >
          Sign Out
        </button>
      </div>
    </header>
  );
}
