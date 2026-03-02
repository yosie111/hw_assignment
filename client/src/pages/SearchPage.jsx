// client/src/pages/SearchPage.jsx

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { searchProducts } from '../api/client';
import SearchForm from '../components/SearchForm/SearchForm';
import SiteSelector from '../components/SiteSelector/SiteSelector';
import ProductCard from '../components/ProductCard/ProductCard';
import ErrorDisplay from '../components/ErrorDisplay/ErrorDisplay';
import styles from './SearchPage.module.css';

export default function SearchPage() {
  const navigate = useNavigate();
  const [site, setSite] = useState('saucedemo');
  const [products, setProducts] = useState([]);
  const [recommendedId, setRecommendedId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [searched, setSearched] = useState(false);

  const handleSearch = async (searchParams = {}) => {
    setLoading(true);
    setError(null);
    try {
      const params = { query: 'Sauce', filters: {}, ...searchParams, site };
      const data = await searchProducts(params);
      setProducts(data.products);
      setRecommendedId(data.recommendedId || null);
      setSearched(true);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  };

  const handleBuyClick = (product) => {
    navigate('/purchase', { state: { product, site } });
  };

  const getSiteDisplayName = () => {
    return site === 'amazon' ? 'Amazon' : 'Saucedemo';
  };

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1>E-Commerce Product Search</h1>
        <p className={styles.subtitle}>Automated search with Oracle tax calculation</p>
      </header>

      <SiteSelector 
        selectedSite={site} 
        onSiteChange={setSite} 
        disabled={loading}
      />

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
          <h2>Found {products.length} products on {getSiteDisplayName()}</h2>
          <div className={styles.grid}>
            {products.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                isRecommended={product.id === recommendedId}
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
