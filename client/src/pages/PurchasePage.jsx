// client/src/pages/PurchasePage.jsx

import React, { useState, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { purchaseProduct, getStatus } from '../api/client';
import { usePolling } from '../hooks/usePolling';
import ShippingForm from '../components/ShippingForm/ShippingForm';
import StatusDisplay from '../components/StatusDisplay/StatusDisplay';
import ErrorDisplay from '../components/ErrorDisplay/ErrorDisplay';
import styles from './PurchasePage.module.css';

const POLL_INTERVAL = 2000;

export default function PurchasePage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { product } = location.state || {};

  const [requestId, setRequestId] = useState(null);
  const [status, setStatus] = useState(null);
  const [error, setError] = useState(null);
  const [isInitiating, setIsInitiating] = useState(false);
  const [shouldPoll, setShouldPoll] = useState(false);

  // Polling callback — runs every 2s while shouldPoll is true
  const pollStatus = useCallback(async () => {
    if (!requestId) return;
    try {
      const data = await getStatus(requestId);
      setStatus(data);

      if (data.status === 'completed' || data.status === 'failed') {
        setShouldPoll(false);

        if (data.status === 'completed') {
          navigate('/result', { state: { result: data.result } });
        } else {
          setError({ message: data.error || 'Purchase failed' });
        }
      }
    } catch (err) {
      // Continue polling — might be transient network blip
      console.error('Polling error:', err);
    }
  }, [requestId, navigate]);

  usePolling(pollStatus, POLL_INTERVAL, shouldPoll);

  // Initiate purchase
  const handlePurchase = async (shipping) => {
    setIsInitiating(true);
    setError(null);
    try {
      const data = await purchaseProduct({ product, shipping });
      setRequestId(data.requestId);
      setShouldPoll(true);
    } catch (err) {
      setError(err);
      setIsInitiating(false);
    }
  };

  // No product in router state → redirect
  if (!product) {
    return (
      <div className={styles.container}>
        <p>No product selected.</p>
        <button onClick={() => navigate('/')} className={styles.backBtn}>
          Back to Search
        </button>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <h1>Purchase: {product.title}</h1>
      <p className={styles.price}>Price: ${product.price.toFixed(2)}</p>

      {!requestId && (
        <ShippingForm onSubmit={handlePurchase} loading={isInitiating} />
      )}

      {requestId && status && (
        <StatusDisplay status={status} />
      )}

      <ErrorDisplay error={error} />
    </div>
  );
}
