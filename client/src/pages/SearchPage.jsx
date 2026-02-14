// client/src/pages/SearchPage.jsx

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { searchProducts } from '../api/client';
import SearchForm from '../components/SearchForm/SearchForm';
import ProductCard from '../components/ProductCard/ProductCard';
import ErrorDisplay from '../components/ErrorDisplay/ErrorDisplay';
import styles from './SearchPage.module.css';

export default function SearchPage() {
  const navigate = useNavigate();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [searched, setSearched] = useState(false);

  const handleSearch = async (searchParams) => {
    setLoading(true);
    setError(null);
    try {
      const data = await searchProducts(searchParams);
      setProducts(data.products);
      setSearched(true);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  };

  const handleBuyClick = (product) => {
    navigate('/purchase', { state: { product } });
  };

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1>Saucedemo Product Search</h1>
        <p className={styles.subtitle}>Automated search with Oracle tax calculation</p>
      </header>

      <SearchForm onSearch={handleSearch} loading={loading} />

      <ErrorDisplay error={error} onRetry={() => handleSearch({})} />

      {loading && (
        <div className={styles.loading}>
          <div className="spinner"></div>
          <p>Searching... (5-10 seconds)</p>
        </div>
      )}

      {!loading && products.length > 0 && (
        <div className={styles.results}>
          <h2>Found {products.length} products</h2>
          <div className={styles.grid}>
            {products.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                onBuyClick={handleBuyClick}
              />
            ))}
          </div>
        </div>
      )}

      {!loading && searched && products.length === 0 && (
        <p className={styles.empty}>No products found.</p>
      )}
    </div>
  );
}
