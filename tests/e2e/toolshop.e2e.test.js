// tests/e2e/toolshop.e2e.test.js
//
// ★ E2E test — MANDATORY per assignment requirements.
// Full run: Search → Add to Cart → Checkout → Screenshot
//
// This test:
//   ✓ Uses the adapter (same code path as the real UI)
//   ✓ Searches for products
//   ✓ Runs the full purchase flow
//   ✓ Verifies screenshot of order confirmation is saved
//
// Note: Requires network access to https://practicesoftwaretesting.com
// Timeout: 120 seconds (2 minutes) for full flow

const { createAdapter } = require('../../src/automation/adapters/adapterFactory');
const fs = require('fs');

describe('ToolShop E2E', () => {
  jest.setTimeout(120_000); // 2 minutes — browser automation is slow

  let adapter;

  beforeAll(() => {
    adapter = createAdapter('toolshop');
    expect(adapter.name).toBe('toolshop');
  });

  test('Search returns products', async () => {
    const products = await adapter.search({
      query: 'pliers',
      filters: {},
      requestId: 'e2e-search-001',
      onStep: (s) => console.log(`  ► ${s.step} → ${s.status}`),
    });

    expect(products.length).toBeGreaterThan(0);
    expect(products[0]).toHaveProperty('title');
    expect(products[0]).toHaveProperty('price');
    expect(typeof products[0].price).toBe('number');
    expect(products[0].source).toBe('ToolShop');
  });

  test('Search with maxPrice filter', async () => {
    const products = await adapter.search({
      query: '',
      filters: { maxPrice: 20 },
      requestId: 'e2e-search-002',
    });

    // All returned products should be under $20
    for (const p of products) {
      expect(p.price).toBeLessThanOrEqual(20);
    }
  });

  test('Full purchase flow with screenshot', async () => {
    // Step 1: Search for products
    const products = await adapter.search({
      query: '',
      filters: { maxPrice: 50 },
      requestId: 'e2e-purchase-search',
      onStep: (s) => console.log(`  ► ${s.step} → ${s.status}`),
    });
    expect(products.length).toBeGreaterThan(0);

    const selected = products[0];
    console.log(`  Selected: "${selected.title}" @ $${selected.price}`);

    // Step 2: Purchase
    const result = await adapter.purchase({
      productTitle: selected.title,
      shipping: {
        firstName: 'Test',
        lastName: 'User',
        postalCode: '10001',
        address: '123 Test Street',
        city: 'New York',
        state: 'NY',
        country: 'US',
      },
      requestId: 'e2e-purchase-001',
      onStep: (s) => console.log(`  ► ${s.step} → ${s.status}${s.durationMs ? ` (${s.durationMs}ms)` : ''}`),
    });

    console.log('  Result:', result.status, '| Last step:', result.lastStep);

    expect(result.status).toBe('completed');
    expect(result.lastStep).toBe('Checkout');

    // Step 3: Verify screenshots exist
    const allScreenshots = [
      ...(result.cartScreenshots || []),
      ...(result.screenshots || []),
    ];
    expect(allScreenshots.length).toBeGreaterThan(0);

    // Verify order confirmation screenshot exists on disk
    const confirmScreenshot = allScreenshots.find(s => s.includes('order-complete'));
    expect(confirmScreenshot).toBeDefined();
    expect(fs.existsSync(confirmScreenshot)).toBe(true);

    console.log(`  ★ Confirmation screenshot: ${confirmScreenshot}`);
  });
});
