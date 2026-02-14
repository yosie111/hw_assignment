// client/src/components/PriceBreakdown/PriceBreakdown.jsx
//
// Oracle-calculated tax breakdown: subtotal → tax (8%) → total.
// calc comes from searchService enrichment.

import React from 'react';
import styles from './PriceBreakdown.module.css';

export default function PriceBreakdown({ calc }) {
  if (!calc) return null;

  return (
    <div className={styles.breakdown}>
      <div className={styles.row}>
        <span>Subtotal:</span>
        <span>${calc.subtotal.toFixed(2)}</span>
      </div>
      <div className={styles.row}>
        <span>Tax (0%):</span>
        <span>${calc.tax.toFixed(2)}</span>
      </div>
      <div className={`${styles.row} ${styles.total}`}>
        <span>Total:</span>
        <span>${calc.total.toFixed(2)}</span>
      </div>
    </div>
  );
}
