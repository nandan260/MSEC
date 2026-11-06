import React, { useSyncExternalStore } from 'react';
import { recordSource, subscribeRecordSources } from '../offline-cache';

export default function SavedRecordNotice({ endpoint }) {
  const source = useSyncExternalStore(subscribeRecordSources, () => recordSource(endpoint));
  if (!source?.cached) return null;
  return <p className="saved-notice" role="status">Saved records · {new Date(source.savedAt).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })} · Connect to refresh</p>;
}
