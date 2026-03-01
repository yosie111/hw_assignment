#!/usr/bin/env node
// scripts/generate_report.js
//
// ★ Full Purchase Flow → HTML Report → Screenshot
//
// Runs: Search → Select cheapest → Purchase → Generate proof report
// Output:
//   screenshots/purchase-report.html   (self-contained, base64 images)
//   screenshots/purchase-report.png    (full-page screenshot of the report)
//
// Usage: node scripts/generate_report.js [query] [maxPrice]
// Example: node scripts/generate_report.js "" 20
//          node scripts/generate_report.js "backpack"

const fs = require('fs');
const path = require('path');
const { search, purchase } = require('../src/automation');
const { selectProduct } = require('../src/automation/policies/selectProduct');
const { calculateCart } = require('../src/domain/CartCalculator');

// ─── Config ───
const QUERY = process.argv[2] || '';
const MAX_PRICE = process.argv[3] ? parseFloat(process.argv[3]) : 50;
const REQUEST_ID = `report-${Date.now()}`;
const SCREENSHOTS_DIR = path.join(__dirname, '..', 'screenshots');

// Ensure screenshots directory exists
if (!fs.existsSync(SCREENSHOTS_DIR)) fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });

// ─── Helpers ───

function toBase64(filepath) {
  try {
    if (!fs.existsSync(filepath)) return null;
    const buf = fs.readFileSync(filepath);
    return `data:image/png;base64,${buf.toString('base64')}`;
  } catch { return null; }
}

function parseDomPrice(text) {
  if (!text) return null;
  const n = parseFloat(text.replace(/[^0-9.]/g, ''));
  return isNaN(n) ? null : n;
}

function fmtMs(ms) {
  return ms >= 1000 ? `${(ms / 1000).toFixed(1)}s` : `${ms}ms`;
}

// ─── Main ───
(async () => {
  console.log('╔══════════════════════════════════════════════╗');
  console.log('║   Purchase Report Generator                  ║');
  console.log('╚══════════════════════════════════════════════╝\n');

  const allSteps = [];
  const onStep = (event) => {
    allSteps.push(event);
    const icon = event.status === 'completed' ? '✅' : '❌';
    const time = event.durationMs ? ` (${fmtMs(event.durationMs)})` : '';
    console.log(`  ${icon} ${event.step}${time}`);
  };

  // ═══ PHASE 1: SEARCH ═══
  console.log('── Phase 1: Search ──\n');

  const products = await search({
    query: QUERY,
    filters: MAX_PRICE ? { maxPrice: MAX_PRICE } : {},
    requestId: REQUEST_ID,
    onStep,
  });

  console.log(`\n  Found ${products.length} product(s)\n`);

  if (products.length === 0) {
    console.error('  No products found. Exiting.');
    process.exit(1);
  }

  // ═══ PHASE 2: SELECT ═══
  const chosen = selectProduct(products, 'CHEAPEST');
  console.log(`  ★ Selected: "${chosen.title}" ($${chosen.price})\n`);

  // ═══ PHASE 3: PURCHASE ═══
  console.log('── Phase 2: Purchase ──\n');

  const result = await purchase({
    productTitle: chosen.title,
    shipping: { firstName: 'Test', lastName: 'User', postalCode: '12345' },
    requestId: REQUEST_ID,
    onStep,
  });

  if (result.status === 'failed') {
    console.error(`\n  ❌ Purchase failed at ${result.lastStep}: ${result.error}`);
    process.exit(1);
  }

  console.log(`\n  ✅ ${result.confirmText}`);
  console.log(`  Total: ${result.totalText}\n`);

  // ═══ PHASE 4: BUILD REPORT ═══
  console.log('── Phase 3: Generate Report ──\n');

  // Oracle validation
  const calc = calculateCart([chosen]);
  const siteSubtotal = parseDomPrice(result.subtotalText);
  const siteTax = parseDomPrice(result.taxText);
  const siteTotal = parseDomPrice(result.totalText);
  const oracleMatch = siteSubtotal !== null ? Math.abs(calc.subtotal - siteSubtotal) <= 0.02 : false;

  // Collect screenshots as base64
  const allScreenshots = [...(result.cartScreenshots || []), ...(result.screenshots || [])];
  const screenshotData = allScreenshots
    .map((filepath) => {
      const absPath = path.isAbsolute(filepath) ? filepath : path.join(__dirname, '..', filepath);
      return { path: filepath, base64: toBase64(absPath), label: path.basename(filepath, '.png') };
    })
    .filter(s => s.base64);

  console.log(`  📸 Embedded ${screenshotData.length} screenshots`);

  // All steps (search + purchase)
  const combinedSteps = result.steps || allSteps;

  // ═══ Generate HTML ═══
  const html = buildHtml({
    confirmText: result.confirmText,
    product: chosen,
    shipping: { firstName: 'Test', lastName: 'User', postalCode: '12345' },
    oracle: { subtotal: calc.subtotal, tax: calc.tax, total: calc.total },
    site: { subtotal: siteSubtotal, tax: siteTax, total: siteTotal },
    oracleMatch,
    totalText: result.totalText,
    screenshots: screenshotData,
    steps: combinedSteps,
    requestId: REQUEST_ID,
    timestamp: new Date().toISOString(),
  });

  const htmlPath = path.join(SCREENSHOTS_DIR, 'purchase-report.html');
  fs.writeFileSync(htmlPath, html, 'utf8');
  console.log(`  📄 HTML: ${htmlPath}`);

  // ═══ Screenshot the report ═══
  try {
    // Dynamic import — playwright-core or playwright
    let chromium;
    try {
      chromium = require('playwright').chromium;
    } catch {
      chromium = require('playwright-core').chromium;
    }

    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage({ viewport: { width: 1024, height: 800 } });
    await page.goto(`file://${htmlPath}`, { waitUntil: 'networkidle' });

    const pngPath = path.join(SCREENSHOTS_DIR, 'purchase-report.png');
    await page.screenshot({ path: pngPath, fullPage: true });
    await browser.close();

    console.log(`  📸 PNG:  ${pngPath}`);
  } catch (err) {
    console.warn(`  ⚠️  Could not generate PNG screenshot: ${err.message}`);
    console.warn('     HTML report is still available.');
  }

  console.log('\n╔══════════════════════════════════════════════╗');
  console.log('║        ✅ Report Generated                    ║');
  console.log('╚══════════════════════════════════════════════╝\n');
})();


// ═══════════════════════════════════════════════════════
//  HTML Report Builder
// ═══════════════════════════════════════════════════════

function buildHtml({ confirmText, product, shipping, oracle, site, oracleMatch, totalText, screenshots, steps, requestId, timestamp }) {
  const screenshotImgs = screenshots.map((s, i) => `
    <div class="screenshot-item" id="shot-${i}">
      <img src="${s.base64}" alt="${s.label}" class="screenshot-img"
           onclick="selectShot(${i})" />
      <span class="screenshot-label">${s.label}</span>
    </div>`).join('');

  const thumbs = screenshots.map((s, i) => `
    <img src="${s.base64}" alt="${s.label}" class="thumb ${i === 0 ? 'active' : ''}"
         onclick="selectShot(${i})" />`).join('');

  const stepRows = steps.map(s => {
    const icon = s.status === 'completed' ? '✅' : '❌';
    const time = s.durationMs ? fmtMs(s.durationMs) : '—';
    return `<tr>
      <td>${icon}</td>
      <td>${s.step}</td>
      <td>${s.status}</td>
      <td>${time}</td>
      <td>${s.error || ''}</td>
    </tr>`;
  }).join('');

  const totalTime = steps.reduce((sum, s) => sum + (s.durationMs || 0), 0);

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>Purchase Report — ${product.title}</title>
<style>
  :root {
    --primary: #e74c3c;
    --success: #27ae60;
    --warn: #f39c12;
    --text: #2c3e50;
    --text-light: #7f8c8d;
    --bg: #f4f5f7;
    --card: #fff;
    --border: #e1e4e8;
    --match-bg: #d4edda;
    --match-border: #28a745;
    --mismatch-bg: #fff3cd;
    --mismatch-border: #ffc107;
  }

  * { box-sizing: border-box; margin: 0; padding: 0; }

  body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    background: var(--bg);
    color: var(--text);
    padding: 24px;
    max-width: 960px;
    margin: 0 auto;
  }

  /* ─── Header ─── */
  .header h1 { color: var(--success); font-size: 2rem; margin-bottom: 4px; }
  .header .confirm { color: var(--text-light); font-size: 1.05rem; margin-bottom: 4px; }
  .header .meta { color: var(--text-light); font-size: 0.85rem; }

  /* ─── Cards ─── */
  .card {
    background: var(--card);
    border-radius: 8px;
    padding: 20px 24px;
    margin: 16px 0;
    box-shadow: 0 1px 3px rgba(0,0,0,0.08);
  }
  .card h2 { font-size: 1.3rem; margin-bottom: 16px; }

  /* ─── Oracle Comparison ─── */
  .comparison {
    display: flex;
    align-items: center;
    gap: 16px;
  }
  .comparison .col {
    flex: 1;
    background: #f8f9fa;
    border-radius: 6px;
    padding: 14px 18px;
  }
  .comparison .col h3 {
    font-size: 0.9rem;
    color: var(--text-light);
    margin-bottom: 10px;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }
  .comparison .row {
    display: flex;
    justify-content: space-between;
    padding: 4px 0;
    font-size: 0.95rem;
  }
  .comparison .row.total {
    font-weight: 700;
    border-top: 2px solid var(--border);
    padding-top: 8px;
    margin-top: 4px;
  }
  .comparison .arrow {
    font-size: 2rem;
    font-weight: 700;
    color: var(--text-light);
    min-width: 40px;
    text-align: center;
  }
  .raw-text { font-size: 0.82rem; color: var(--text-light); margin-top: 4px; }

  .badge {
    margin-top: 14px;
    padding: 10px 16px;
    border-radius: 6px;
    font-weight: 500;
    font-size: 0.95rem;
  }
  .badge.match {
    background: var(--match-bg);
    border: 1px solid var(--match-border);
    color: #155724;
  }
  .badge.mismatch {
    background: var(--mismatch-bg);
    border: 1px solid var(--mismatch-border);
    color: #856404;
  }

  /* ─── Order Details ─── */
  .detail-label { font-size: 0.85rem; color: var(--text-light); text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px; }
  .detail-value { font-weight: 600; margin-bottom: 2px; }
  .detail-section { padding: 8px 0; border-bottom: 1px solid var(--border); }
  .detail-section:last-child { border-bottom: none; }

  /* ─── Screenshots ─── */
  .main-shot {
    text-align: center;
    margin-bottom: 12px;
  }
  .main-shot img {
    max-width: 100%;
    max-height: 500px;
    border: 1px solid var(--border);
    border-radius: 4px;
    object-fit: contain;
  }
  .thumbs {
    display: flex;
    gap: 8px;
    justify-content: center;
    flex-wrap: wrap;
    margin-bottom: 8px;
  }
  .thumb {
    width: 80px;
    height: 60px;
    object-fit: cover;
    border: 2px solid var(--border);
    border-radius: 4px;
    cursor: pointer;
    opacity: 0.6;
    transition: all 0.2s;
  }
  .thumb:hover { opacity: 0.85; }
  .thumb.active { border-color: var(--primary); opacity: 1; }
  .caption { text-align: center; color: var(--text-light); font-size: 0.9rem; }

  /* ─── Steps Table ─── */
  .steps-table { width: 100%; border-collapse: collapse; font-size: 0.9rem; }
  .steps-table th { text-align: left; padding: 8px 10px; border-bottom: 2px solid var(--border); color: var(--text-light); font-size: 0.82rem; text-transform: uppercase; }
  .steps-table td { padding: 6px 10px; border-bottom: 1px solid var(--border); }
  .steps-table tr:last-child td { border-bottom: none; }
  .total-row { font-weight: 700; background: #f8f9fa; }

  /* ─── Footer ─── */
  .footer { text-align: center; margin-top: 24px; padding: 16px; color: var(--text-light); font-size: 0.85rem; }

  /* ─── Hidden screenshots for gallery ─── */
  .screenshot-item { display: none; }
  .screenshot-item.active { display: block; }
</style>
</head>
<body>

<!-- ═══ HEADER ═══ -->
<div class="header">
  <h1>Order Complete!</h1>
  <p class="confirm">${confirmText || 'Thank you for your order!'}</p>
  <p class="meta">Request ID: ${requestId} &nbsp;·&nbsp; ${timestamp}</p>
</div>

<!-- ═══ ORACLE VERIFICATION ═══ -->
<div class="card">
  <h2>Oracle Pattern Verification</h2>
  <div class="comparison">
    <div class="col">
      <h3>Oracle (Calculated)</h3>
      <div class="row"><span>Subtotal:</span><span>$${oracle.subtotal.toFixed(2)}</span></div>
      <div class="row"><span>Tax (0%):</span><span>$${oracle.tax.toFixed(2)}</span></div>
      <div class="row total"><span>Total:</span><span>$${oracle.total.toFixed(2)}</span></div>
    </div>
    <div class="arrow">${oracleMatch ? '=' : '≠'}</div>
    <div class="col">
      <h3>Site (Actual)</h3>
      ${site.subtotal !== null ? `<div class="row"><span>Subtotal:</span><span>$${site.subtotal.toFixed(2)}</span></div>` : ''}
      ${site.tax !== null ? `<div class="row"><span>Tax:</span><span>$${site.tax.toFixed(2)}</span></div>` : ''}
      <div class="row total"><span>Total:</span><span>$${(site.total !== null ? site.total : 0).toFixed(2)}</span></div>
      ${totalText ? `<p class="raw-text">Raw text: ${totalText}</p>` : ''}
    </div>
  </div>
  <div class="badge ${oracleMatch ? 'match' : 'mismatch'}">
    ${oracleMatch
      ? 'Match — Oracle subtotal matches the site subtotal.'
      : 'Mismatch detected — Oracle subtotal differs from the site subtotal.'}
  </div>
</div>

<!-- ═══ ORDER DETAILS ═══ -->
<div class="card">
  <h2>Order Details</h2>
  <div class="detail-section">
    <p class="detail-label">Product</p>
    <p class="detail-value">${product.title}</p>
    <p>Price: $${product.price.toFixed(2)} ${product.currency || 'USD'}</p>
  </div>
  <div class="detail-section">
    <p class="detail-label">Shipping</p>
    <p class="detail-value">${shipping.firstName} ${shipping.lastName}</p>
    <p>Postal Code: ${shipping.postalCode}</p>
  </div>
</div>

<!-- ═══ PROOF SCREENSHOTS ═══ -->
${screenshots.length > 0 ? `
<div class="card">
  <h2>Proof Screenshots</h2>
  <div class="main-shot" id="mainShot">
    <img src="${screenshots[0].base64}" alt="Screenshot 1" id="mainImg" />
  </div>
  ${screenshots.length > 1 ? `
  <div class="thumbs" id="thumbsContainer">
    ${thumbs}
  </div>` : ''}
  <p class="caption" id="captionText">1 / ${screenshots.length}</p>
</div>` : ''}

<!-- ═══ AUTOMATION STEPS ═══ -->
<div class="card">
  <h2>Automation Steps</h2>
  <table class="steps-table">
    <thead>
      <tr><th></th><th>Step</th><th>Status</th><th>Time</th><th>Error</th></tr>
    </thead>
    <tbody>
      ${stepRows}
      <tr class="total-row">
        <td></td>
        <td>Total</td>
        <td></td>
        <td>${fmtMs(totalTime)}</td>
        <td></td>
      </tr>
    </tbody>
  </table>
</div>

<div class="footer">
  Generated by E-Commerce Automation PoC &nbsp;·&nbsp; ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
</div>

<script>
  let currentShot = 0;
  const shots = ${JSON.stringify(screenshots.map(s => s.base64))};

  function selectShot(i) {
    currentShot = i;
    document.getElementById('mainImg').src = shots[i];
    document.getElementById('captionText').textContent = (i + 1) + ' / ' + shots.length;
    document.querySelectorAll('.thumb').forEach((t, idx) => {
      t.classList.toggle('active', idx === i);
    });
  }
</script>

</body>
</html>`;
}
