// client/src/components/ProductCard/ProductCard.jsx

import React from 'react';
import PriceBreakdown from '../PriceBreakdown/PriceBreakdown';
import styles from './ProductCard.module.css';

export default function ProductCard({ product, isRecommended, onBuyClick }) {
  return (
    <div className={`${styles.card} ${isRecommended ? styles.recommended : ''}`}>
      {isRecommended && (
        <span className={styles.badge}>Cheapest</span>
      )}
      {product.imageUrl && (
        <img
          src={product.imageUrl}
          alt={product.title}
          className={styles.image}
          loading="lazy"
        />
      )}

      <div className={styles.content}>
        <h3 className={styles.title}>{product.title}</h3>
        <p className={styles.price}>${product.price.toFixed(2)}</p>

        <PriceBreakdown calc={product.calc} />

        <button
          onClick={() => onBuyClick(product)}
          className={styles.buyBtn}
        >
          Buy Now
        </button>
      </div>
    </div>
  );
}
