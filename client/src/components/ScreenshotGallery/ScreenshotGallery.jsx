// client/src/components/ScreenshotGallery/ScreenshotGallery.jsx
//
// Displays automation proof screenshots.
// screenshots prop = screenshotUrls from statusRoutes (already URLs).
// Includes image fallback (onError) per improvement recommendation.

import React, { useState } from 'react';
import styles from './ScreenshotGallery.module.css';

const PLACEHOLDER =
  'data:image/svg+xml,' +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300">' +
    '<rect fill="#ddd" width="400" height="300"/>' +
    '<text x="50%" y="50%" text-anchor="middle" fill="#999" font-size="16">Image not available</text>' +
    '</svg>'
  );

export default function ScreenshotGallery({ screenshots }) {
  const [selectedIndex, setSelectedIndex] = useState(0);

  if (!screenshots || screenshots.length === 0) return null;

  return (
    <div className={styles.container}>
      <h2 className={styles.heading}>Proof Screenshots</h2>

      <div className={styles.main}>
        <img
          src={screenshots[selectedIndex]}
          alt={`Screenshot ${selectedIndex + 1}`}
          className={styles.mainImage}
          onError={(e) => { e.target.src = PLACEHOLDER; }}
        />
      </div>

      {screenshots.length > 1 && (
        <div className={styles.thumbs}>
          {screenshots.map((url, i) => (
            <img
              key={i}
              src={url}
              alt={`Thumb ${i + 1}`}
              className={`${styles.thumb} ${i === selectedIndex ? styles.active : ''}`}
              onClick={() => setSelectedIndex(i)}
              onError={(e) => { e.target.src = PLACEHOLDER; }}
            />
          ))}
        </div>
      )}

      <p className={styles.caption}>
        {selectedIndex + 1} / {screenshots.length}
      </p>
    </div>
  );
}
