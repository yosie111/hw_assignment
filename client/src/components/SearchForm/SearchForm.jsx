// client/src/components/SearchForm/SearchForm.jsx

import React, { useState } from 'react';
import styles from './SearchForm.module.css';

export default function SearchForm({ onSearch, loading }) {
  const [query, setQuery] = useState('');
  const [maxPrice, setMaxPrice] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    const filters = {};
    if (maxPrice && parseFloat(maxPrice) > 0) {
      filters.maxPrice = parseFloat(maxPrice);
    }
    onSearch({ query, filters });
  };

  return (
    <form onSubmit={handleSubmit} className={styles.form}>
      <input
        type="text"
        placeholder="Search (empty = all products)"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        disabled={loading}
        className={styles.input}
      />
      <input
        type="number"
        placeholder="Max price"
        value={maxPrice}
        onChange={(e) => setMaxPrice(e.target.value)}
        min="0"
        step="0.01"
        disabled={loading}
        className={styles.priceInput}
      />
      <button type="submit" disabled={loading} className={styles.btn}>
        {loading ? 'Searching...' : 'Search'}
      </button>
    </form>
  );
}
