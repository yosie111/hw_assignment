// client/src/components/SiteSelector/SiteSelector.jsx

import React from 'react';
import styles from './SiteSelector.module.css';

const SITES = [
  { id: 'saucedemo', name: 'Saucedemo', url: 'https://www.saucedemo.com' },
  { id: 'amazon', name: 'Amazon', url: 'https://www.amazon.com' },
];

export default function SiteSelector({ selectedSite, onSiteChange, disabled }) {
  return (
    <div className={styles.container}>
      <label className={styles.label}>Select Site:</label>
      <div className={styles.siteButtons}>
        {SITES.map((site) => (
          <button
            key={site.id}
            type="button"
            className={`${styles.siteButton} ${selectedSite === site.id ? styles.active : ''}`}
            onClick={() => onSiteChange(site.id)}
            disabled={disabled}
          >
            <span className={styles.siteName}>{site.name}</span>
            <span className={styles.siteUrl}>{site.url}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
