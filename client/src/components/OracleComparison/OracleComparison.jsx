// client/src/components/OracleComparison/OracleComparison.jsx
//
// Oracle Pattern Verification — core assignment requirement.
//
// ACTUAL cartValidation from purchaseService:
// {
//   breakdown: { subtotal: 7.99, tax: 0.64, total: 8.63 },   ← Oracle
//   fromSite: 8.63,                                            ← number!
//   match: true
// }
//
// ⚠️ V2 bug: used calculated.subtotal & fromSite.subtotal — DOESN'T EXIST.
// ✅ V3 fix: uses breakdown.subtotal & fromSite as number.

import React from 'react';
import styles from './OracleComparison.module.css';

export default function OracleComparison({ cartValidation, totalText }) {
  if (!cartValidation) return null;

  const { match, breakdown, fromSite } = cartValidation;

  return (
    <div className={styles.container}>
      <h2 className={styles.heading}>Oracle Pattern Verification</h2>

      <div className={styles.comparison}>
        {/* Left: Oracle — what SHOULD be */}
        <div className={styles.column}>
          <h3 className={styles.colTitle}>Oracle (Calculated)</h3>
          <div className={styles.row}>
            <span>Subtotal:</span>
            <span>${breakdown.subtotal.toFixed(2)}</span>
          </div>
          <div className={styles.row}>
            <span>Tax (0%):</span>
            <span>${breakdown.tax.toFixed(2)}</span>
          </div>
          <div className={`${styles.row} ${styles.total}`}>
            <span>Total:</span>
            <span>${breakdown.total.toFixed(2)}</span>
          </div>
        </div>

        {/* Arrow / status */}
        <div className={styles.arrow}>
          {match ? '=' : '\u2260'}
        </div>

        {/* Right: Site — what actually happened */}
        <div className={styles.column}>
          <h3 className={styles.colTitle}>Site (Actual)</h3>
          <div className={`${styles.row} ${styles.total}`}>
            <span>Total:</span>
            <span>${fromSite.toFixed(2)}</span>
          </div>
          {totalText && (
            <p className={styles.raw}>Raw text: {totalText}</p>
          )}
        </div>
      </div>

      <div className={`${styles.badge} ${match ? styles.match : styles.mismatch}`}>
        {match
          ? 'Match — Oracle calculation matches the site total exactly.'
          : 'Mismatch detected — the calculated total differs from the site.'}
      </div>
    </div>
  );
}
