// client/src/components/CartReview/CartReview.jsx
//
// ★ Assignment requirement: "מסך סטטוס/עגלה — הצגת מצב הריצה של האוטומציה"
//
// Displays the selected product as a "cart" before proceeding to checkout.
// Shows product name, price, calculated tax, and total.

import React from 'react';
import styles from './CartReview.module.css';

export default function CartReview({ product, onProceed, onBack }) {
  if (!product) return null;

  const subtotal = product.price;
  const tax = product.calc ? product.calc.tax : 0;
  const total = product.calc ? product.calc.total : subtotal;

  return (
    <div className={styles.cart}>
      <h2 className={styles.heading}>Your Cart</h2>

      <div className={styles.item}>
        <div className={styles.itemInfo}>
          <span className={styles.title}>{product.title}</span>
          <span className={styles.source}>{product.source}</span>
        </div>
        <span className={styles.price}>${subtotal.toFixed(2)}</span>
      </div>

      <div className={styles.divider} />

      <div className={styles.summary}>
        <div className={styles.row}>
          <span>Subtotal</span>
          <span>${subtotal.toFixed(2)}</span>
        </div>
        <div className={styles.row}>
          <span>Tax</span>
          <span>${tax.toFixed(2)}</span>
        </div>
        <div className={`${styles.row} ${styles.totalRow}`}>
          <span>Total</span>
          <span>${total.toFixed(2)}</span>
        </div>
      </div>

      <div className={styles.actions}>
        <button className={styles.backBtn} onClick={onBack}>
          Back to Search
        </button>
        <button className={styles.proceedBtn} onClick={onProceed}>
          Proceed to Checkout
        </button>
      </div>
    </div>
  );
}
