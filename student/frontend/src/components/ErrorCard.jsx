import React from 'react';
import { NetworkError } from '../api.js';
import './components.css';

// A raw TypeError is what fetch() throws when the network fails, and some screens call fetch directly.
function isNetworkError(error) {
  return error instanceof NetworkError || error instanceof TypeError;
}

export default function ErrorCard({ error, onRetry }) {
  const network = isNetworkError(error);
  return (
    <div className="card error-card" role="alert">
      {network ? (
        <>
          <h2 className="section-title">Can't reach the server</h2>
          <p className="error-card-hint">Check your connection and try again.</p>
        </>
      ) : (
        <p>{error?.message}</p>
      )}
      {onRetry && (
        <button type="button" className="btn btn-primary" onClick={onRetry}>
          Retry
        </button>
      )}
    </div>
  );
}
