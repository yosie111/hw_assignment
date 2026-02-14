// client/src/pages/ResultPage.jsx

import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import OracleComparison from '../components/OracleComparison/OracleComparison';
import OrderSummary from '../components/OrderSummary/OrderSummary';
import ScreenshotGallery from '../components/ScreenshotGallery/ScreenshotGallery';
import styles from './ResultPage.module.css';

export default function ResultPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { result } = location.state || {};

  if (!result) {
    return (
      <div className={styles.container}>
        <p>No result data. Please start a new search.</p>
        <button onClick={() => navigate('/')} className={styles.backBtn}>
          Back to Search
        </button>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1>Order Complete!</h1>
        {result.confirmText && <p className={styles.confirm}>{result.confirmText}</p>}
      </header>

      <OracleComparison
        cartValidation={result.cartValidation}
        totalText={result.totalText}
      />

      <OrderSummary product={result.product} shipping={result.shipping} />

      {/* screenshotUrls arrive ready from statusRoutes — no conversion needed */}
      <ScreenshotGallery screenshots={result.screenshotUrls} />

      <div className={styles.actions}>
        <button onClick={() => navigate('/')} className={styles.newBtn}>
          New Search
        </button>
      </div>
    </div>
  );
}
