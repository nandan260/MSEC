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

export const UNAUTHORIZED_EVENT = 'msec:unauthorized';

function isApiUrl(url) {
  const api = apiUrl('/api/');
  return typeof url === 'string' && (url.startsWith(api) || url.startsWith('/api/'));
}

function isAuthEndpoint(url) {
  return /\/api\/auth\/(login|code|password\/reset|google|config)/.test(url);
}

// A 401 on a signed-in request means the session ended (expired, revoked, disabled).
function sessionEnded(url, hadToken) {
  if (!hadToken || isAuthEndpoint(url)) return;
  clearAuth();
  window.dispatchEvent(new CustomEvent(UNAUTHORIZED_EVENT));
}

// Screens that call fetch() directly still get the bearer token and 401 handling.
export function installFetchAuth() {
  if (typeof window === 'undefined' || window.__msecFetchAuth) return;
  const original = window.fetch.bind(window);
  window.__msecFetchAuth = true;
  window.fetch = async (input, init = {}) => {
    const url = typeof input === 'string' ? input : input?.url;
    if (!isApiUrl(url)) return original(input, init);
    const token = getToken();
    const headers = new Headers(init.headers || (typeof input !== 'string' ? input.headers : undefined));
    if (token && !headers.has('Authorization')) headers.set('Authorization', `Bearer ${token}`);
    const response = await original(input, { ...init, headers });
    if (response.status === 401) sessionEnded(url, !!token);
    return response;
  };
}

// Links opened outside fetch (new tab, system browser) carry a 5-minute download-only token.
export async function openDownload(path) {
  const { token } = await apiRequest('/auth/download-token', { method: 'POST' });
  const url = apiUrl(path);
  await openExternal(`${url}${url.includes('?') ? '&' : '?'}dl=${encodeURIComponent(token)}`);
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
    if (response.status === 401) sessionEnded('/api' + endpoint, !!token);
    const error = new Error(data.error || `HTTP error ${response.status}`);
    error.status = response.status;
    error.code = data.code;
    throw error;
  }

  if (read) {
    if (requestOwner === recordOwner()) {
      saveResponse(endpoint, data);
      reportRecordSource(endpoint, false, Date.now());
    }
  } else clearSavedResponses();
  return data;
}
