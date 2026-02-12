// scripts/run_demo.js
// ★ Full PoC — uses ONLY the public API (index.js)
// This is how the Services layer will call the Automation layer.
// Usage: node scripts/run_demo.js

const { search, purchase } = require('../src/automation');
const { selectProduct } = require('../src/automation/policies/selectProduct');

(async () => {
  console.log('╔══════════════════════════════════════╗');
  console.log('║   E-Commerce Automation — Full PoC   ║');
  console.log('╚══════════════════════════════════════╝\n');

  // ========== STEP 1: SEARCH ==========
  console.log('=== PHASE 1: SEARCH ===\n');

  const products = await search({
    query: '',
    filters: { maxPrice: 20 },
    requestId: 'demo-001',
    onStep: (event) => console.log(`  ► ${event.step} → ${event.status}${event.durationMs ? ` (${event.durationMs}ms)` : ''}`),
  });

  console.log(`\n  Found ${products.length} product(s) under $20:\n`);
  products.forEach(p =>
    console.log(`  • [${p.id}] ${p.title} — $${p.price} ${p.currency}`)
  );

  if (products.length === 0) {
    console.log('\n  No products found. Done.');
    return;
  }

  // ========== STEP 2: SELECT ==========
  const chosen = selectProduct(products, 'CHEAPEST');
  console.log(`\n  ★ Selected: "${chosen.title}" ($${chosen.price})\n`);

  // ========== STEP 3: PURCHASE ==========
  console.log('=== PHASE 2: PURCHASE ===\n');

  const result = await purchase({
    productTitle: chosen.title,
    shipping: {
      firstName: 'Test',
      lastName: 'User',
      postalCode: '12345',
    },
    requestId: 'demo-001',
    onStep: (event) => console.log(`  ► ${event.step} → ${event.status}${event.durationMs ? ` (${event.durationMs}ms)` : ''}`),
  });

  // ========== RESULTS ==========
  console.log('\n=== RESULTS ===\n');
  console.log(`  Status:     ${result.status}`);
  console.log(`  Last Step:  ${result.lastStep}`);

  if (result.status === 'completed') {
    console.log(`  Confirm:    ${result.confirmText}`);
    console.log(`  Total:      ${result.totalText}`);

    const allScreenshots = [...(result.cartScreenshots || []), ...(result.screenshots || [])];
    console.log(`\n  📸 Screenshots (${allScreenshots.length}):`);
    allScreenshots.forEach((s, i) => console.log(`     ${i + 1}. ${s}`));

    console.log('\n  📊 Step timings:');
    result.steps.forEach(s =>
      console.log(`     ${s.step}: ${s.status} (${s.durationMs}ms)`)
    );

    console.log('\n╔══════════════════════════════════════╗');
    console.log('║        ✅ POC COMPLETED              ║');
    console.log('╚══════════════════════════════════════╝');
  } else {
    console.log(`  Error:      ${result.error}`);
    if (result.screenshotPath) {
      console.log(`  Error shot: ${result.screenshotPath}`);
    }
    console.log('\n  ❌ POC FAILED');
    process.exit(1);
  }
})();
