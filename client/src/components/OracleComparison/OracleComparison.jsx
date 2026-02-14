// client/src/components/OracleComparison/OracleComparison.jsx
//
// Oracle Pattern Verification — core assignment requirement.
//
// V4: Compares Oracle subtotal vs Site subtotal (tax-independent).
//     Shows full breakdown for both Oracle and Site.
//
// cartValidation from purchaseService:
// {
//   breakdown: { subtotal: 29.99, tax: 0, total: 29.99 },   ← Oracle
//   site: { subtotal: 29.99, tax: 2.40, total: 32.39 },     ← Site (parsed from DOM)
//   fromSite: 32.39,                                          ← backward compat
//   match: true                                                ← subtotal vs subtotal
// }

import React from 'react';
import styles from './OracleComparison.module.css';

export default function OracleComparison({ cartValidation, totalText, taxRate = 0 }) {
  if (!cartValidation) return null;

  const { match, breakdown, site, fromSite } = cartValidation;

  // Backward compat: if site object doesn't exist, fall back to fromSite
  const siteData = site || { subtotal: fromSite, tax: null, total: fromSite };

  return (
    <div className={styles.container}>
      <h2 className={styles.heading}>Oracle Pattern Verification</h2>

      <div className={styles.comparison}>
        {/* Left: Oracle — what we calculated */}
        <div className={styles.column}>
          <h3 className={styles.colTitle}>Oracle (Calculated)</h3>
          <div className={styles.row}>
            <span>Subtotal:</span>
            <span>${breakdown.subtotal.toFixed(2)}</span>
          </div>
          <div className={styles.row}>
            <span>Tax ({(taxRate * 100).toFixed(0)}%):</span>
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
          {siteData.subtotal != null && (
            <div className={styles.row}>
              <span>Subtotal:</span>
              <span>${siteData.subtotal.toFixed(2)}</span>
            </div>
          )}
          {siteData.tax != null && (
            <div className={styles.row}>
              <span>Tax:</span>
              <span>${siteData.tax.toFixed(2)}</span>
            </div>
          )}
          <div className={`${styles.row} ${styles.total}`}>
            <span>Total:</span>
            <span>${(siteData.total != null ? siteData.total : fromSite).toFixed(2)}</span>
          </div>
          {totalText && (
            <p className={styles.raw}>Raw text: {totalText}</p>
          )}
        </div>
      </div>

      <div className={`${styles.badge} ${match ? styles.match : styles.mismatch}`}>
        {match
          ? 'Match \u2014 Oracle subtotal matches the site subtotal.'
          : 'Mismatch detected \u2014 Oracle subtotal differs from the site subtotal.'}
      </div>
    </div>
  );
}
