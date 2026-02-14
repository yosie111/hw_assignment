// client/src/components/OrderSummary/OrderSummary.jsx

import React from 'react';
import styles from './OrderSummary.module.css';

export default function OrderSummary({ product, shipping }) {
  return (
    <div className={styles.container}>
      <h2 className={styles.heading}>Order Details</h2>

      <div className={styles.section}>
        <h3>Product</h3>
        <p><strong>{product.title}</strong></p>
        <p>Price: ${product.price.toFixed(2)}</p>
      </div>

      {shipping && (
        <div className={styles.section}>
          <h3>Shipping</h3>
          <p>{shipping.firstName} {shipping.lastName}</p>
          <p>Postal Code: {shipping.postalCode}</p>
        </div>
      )}
    </div>
  );
}
