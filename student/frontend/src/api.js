import { savedResponse, saveResponse, clearSavedResponses, recordOwner, reportRecordSource, beginRecordRequest } from './offline-cache';
// API Communication Helper
const API_BASE = (import.meta.env.VITE_API_BASE || '').replace(/\/$/, '');

export class NetworkError extends Error {
  constructor(message = 'Cannot reach the server. Check your connection and try again.') {
    super(message);
    this.name = 'NetworkError';
  }
}

export function apiUrl(path) {
  if (!path) return '';
  if (/^https?:\/\//i.test(path)) return path;
  return `${API_BASE}${path}`;
}

export function isNative() {
  return !!(typeof window !== 'undefined' && window.Capacitor?.isNativePlatform?.());
}

export async function openExternal(url) {
  if (isNative()) {
    const { Browser } = await import('@capacitor/browser');
    await Browser.open({ url });
  } else {
    window.open(url, '_blank');
  }
}

export function setToken(token) {
  if (token) localStorage.setItem('auth_token', token);
  else localStorage.removeItem('auth_token');
}

export function getToken() {
  return localStorage.getItem('auth_token');
}

export function setUser(user) {
  if (user) localStorage.setItem('auth_user', JSON.stringify(user));
  else localStorage.removeItem('auth_user');
}

export function getUser() {
  const u = localStorage.getItem('auth_user');
  try {
    return u ? JSON.parse(u) : null;
  } catch {
    return null;
  }
}

export function clearAuth() {
  clearSavedResponses();
  localStorage.removeItem('auth_token');
  localStorage.removeItem('auth_user');
}

export async function apiRequest(endpoint, options = {}) {
  const read = !options.method || options.method.toUpperCase() === 'GET';
  const requestOwner = recordOwner();
  if (read) beginRecordRequest(endpoint);
  const token = getToken();
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    ...(options.headers || {})
  };

  let response;
  try {
    response = await fetch(apiUrl('/api' + endpoint), {
      ...options,
      headers
    });
  } catch (e) {
    if (e instanceof TypeError) {
      const saved = read && requestOwner === recordOwner() && savedResponse(endpoint);
      if (saved) {
        reportRecordSource(endpoint, true, saved.savedAt);
        return saved.data;
      }
      throw new NetworkError();
    }
    throw e;
  }

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.error || `HTTP error ${response.status}`);
  }

  if (read) {
    if (requestOwner === recordOwner()) {
      saveResponse(endpoint, data);
      reportRecordSource(endpoint, false, Date.now());
    }
  } else clearSavedResponses();
  return data;
}
