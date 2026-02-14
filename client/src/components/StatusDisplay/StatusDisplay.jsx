// client/src/components/StatusDisplay/StatusDisplay.jsx
//
// Live progress during purchase.
// Step names match what Automation actually sends.

import React from 'react';
import styles from './StatusDisplay.module.css';

// Actual step names from automation (verified from tests):
//   Search:   OpenBrowser → Login → SearchAndScrape
//   Purchase: Login → AddToCart → Checkout
const STEP_LABELS = {
  OpenBrowser:     'Opening browser',
  Login:           'Logging in',
  SearchAndScrape: 'Searching products',
  AddToCart:       'Adding to cart',
  Checkout:        'Processing checkout',
};

export default function StatusDisplay({ status }) {
  if (!status) return null;

  const { currentStep, steps, status: statusType } = status;

  return (
    <div className={styles.container}>
      <h2 className={styles.heading}>Live Progress</h2>

      {statusType === 'running' && currentStep && (
        <div className={styles.current}>
          <div className="spinner"></div>
          <span>{STEP_LABELS[currentStep] || currentStep}</span>
        </div>
      )}

      <div className={styles.steps}>
        {steps && steps.map((step, i) => (
          <div key={i} className={`${styles.step} ${styles[step.status] || ''}`}>
            <span className={styles.icon}>
              {step.status === 'completed' && '✓'}
              {step.status === 'running' && '⟳'}
              {step.status === 'failed' && '✗'}
            </span>
            <span className={styles.name}>
              {STEP_LABELS[step.step] || step.step}
            </span>
            {step.durationMs != null && (
              <span className={styles.duration}>
                ({(step.durationMs / 1000).toFixed(1)}s)
              </span>
            )}
            {step.error && (
              <p className={styles.stepError}>{step.error}</p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
