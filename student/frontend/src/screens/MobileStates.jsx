import React, { useState } from 'react';
import { Icon } from '../components/Shell/icons';
import { apiRequest } from '../api';
import { latestSavedResponse } from '../offline-cache';

export const OFFLINE_ENDPOINTS = {
  dashboard: '/dashboard/summary', attendance: '/attendance',
  academics: '/academics/performance', timetable: '/timetable',
};

export function OfflineScreen({ screenId, onShowSaved }) {
  const endpoint = OFFLINE_ENDPOINTS[screenId];
  const saved = latestSavedResponse(endpoint);
  const [retrying, setRetrying] = useState(false);
  const [message, setMessage] = useState('');
  async function retry() {
    setRetrying(true);
    setMessage('');
    try {
      await apiRequest(saved?.endpoint || (screenId === 'academics' ? `${endpoint}?semester=6` : screenId === 'timetable' ? `${endpoint}?view=daily&day=1` : endpoint));
      onShowSaved(saved?.endpoint);
    } catch {
      setMessage('Still unable to connect. Try again when you’re online.');
    } finally { setRetrying(false); }
  }
  return (
    <section className="mobile-state offline-state" aria-label="Offline">
      <div className="offline-state__icon"><Icon name="wifiOff" size={40} /></div>
      <div><h2>You're offline</h2><p>{saved
        ? `Saved data from ${new Date(saved.savedAt).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}.`
        : 'Connect to load your student records.'}</p></div>
      <button className="state-button" type="button" onClick={retry} disabled={retrying}><Icon name="retry" size={18} />{retrying ? 'Trying…' : 'Try again'}</button>
      {saved && <button type="button" className="state-link" onClick={() => onShowSaved(saved.endpoint)}>Show saved records</button>}
      {message && <p role="status">{message}</p>}
    </section>
  );
}

export function NotFoundScreen({ onNavigate, onBack }) {
  return (
    <main className="not-found">
      <button type="button" className="circle-btn" aria-label="Back" onClick={onBack}><Icon name="back" size={20} /></button>
      <div className="not-found__body">
        <div className="not-found__code" aria-hidden="true">4<span>0</span>4</div>
        <div><h1>Page not found</h1><p>This link may have moved.</p></div>
      </div>
      <div className="not-found__actions">
        <button type="button" className="state-button" onClick={() => onNavigate('dashboard')}>Go to Home</button>
        <button type="button" className="state-button state-button--tint" onClick={() => onNavigate('assistant')}>Ask AI for help</button>
      </div>
    </main>
  );
}
