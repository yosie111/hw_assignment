// client/src/components/ErrorDisplay/ErrorDisplay.jsx

import React from 'react';
import styles from './ErrorDisplay.module.css';

export default function ErrorDisplay({ error, onRetry }) {
  if (!error) return null;

  return (
    <div className={styles.box}>
      <strong className={styles.title}>Error</strong>
      <p className={styles.message}>{error.message || 'Something went wrong.'}</p>

      {error.details && error.details.length > 0 && (
        <ul className={styles.details}>
          {error.details.map((d, i) => (
            <li key={i}><strong>{d.field}:</strong> {d.message}</li>
          ))}
        </ul>
      )}

      {onRetry && (
        <button onClick={onRetry} className={styles.retryBtn}>Retry</button>
      )}
    </div>
  );
}
