const PREFIX = 'msec:student-records:v1:';
const CACHEABLE = /^\/(dashboard\/summary|attendance|academics\/performance|timetable|gpa\/history)(\?|$)/;
const sources = new Map();
const listeners = new Set();
const activeViews = new Map();

export function beginRecordRequest(endpoint) {
  if (CACHEABLE.test(endpoint)) activeViews.set(endpoint.split('?')[0], endpoint);
}

export function subscribeRecordSources(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function recordSource(endpoint) { return sources.get(endpoint) || null; }

export function reportRecordSource(endpoint, cached, savedAt) {
  if (!CACHEABLE.test(endpoint)) return;
  sources.set(endpoint, { cached, savedAt });
  for (const listener of listeners) listener();
}

export function recordOwner() {
  try {
    const user = JSON.parse(localStorage.getItem('auth_user') || 'null');
    return user?.identifier || user?.usn || user?.id || (localStorage.getItem('auth_token') ? null : 'demo');
  } catch { return null; }
}

function key(endpoint) {
  const id = recordOwner();
  return id == null ? null : `${PREFIX}${encodeURIComponent(id)}:${endpoint}`;
}

export function savedResponse(endpoint) {
  try {
    const id = key(endpoint);
    const value = id && JSON.parse(localStorage.getItem(id) || 'null');
    return value && Number.isFinite(value.savedAt) && value.data ? value : null;
  } catch { return null; }
}

export function saveResponse(endpoint, data) {
  if (!CACHEABLE.test(endpoint)) return;
  try {
    const id = key(endpoint);
    if (id) localStorage.setItem(id, JSON.stringify({ endpoint, data, savedAt: Date.now() }));
  } catch { /* Storage unavailable or full: online requests still work. */ }
}

export function clearSavedResponses() {
  sources.clear();
  activeViews.clear();
  for (const listener of listeners) listener();
  try {
    for (const id of Object.keys(localStorage)) if (id.startsWith(PREFIX)) localStorage.removeItem(id);
  } catch { /* Storage may be disabled. */ }
}

export function latestSavedResponse(endpointPrefix) {
  try {
    const selected = activeViews.get(endpointPrefix);
    const selectedResponse = selected && savedResponse(selected);
    if (selectedResponse) return selectedResponse;
    const id = key(endpointPrefix);
    if (!id) return null;
    return Object.keys(localStorage).filter((k) => k === id || k.startsWith(`${id}?`))
      .map((k) => JSON.parse(localStorage.getItem(k)))
      .filter((v) => v && v.data && Number.isFinite(v.savedAt))
      .sort((a, b) => b.savedAt - a.savedAt)[0] || null;
  } catch { return null; }
}
