// tests/e2e/fullPurchase.e2e.test.js
//
// ═══════════════════════════════════════════════════════════════════
// E2E Integration Test — Full Purchase Flow
// ═══════════════════════════════════════════════════════════════════
//
// Assignment requirement (Section 5):
//   "ריצה מלאה: חיפוש → הוספה לעגלה → Checkout → Success"
//   "הבדיקה חייבת לייצר Screenshot של מסך האישור"
//
// What this test does:
//   1. Creates a REAL adapter (SauceDemoAdapter) — no mocks, no FakeAdapter
//   2. Searches the live site via Playwright automation
//   3. Selects a specific product
//   4. Purchases that exact product (Add to Cart → Checkout → Confirm)
//   5. Verifies screenshot proof exists on disk
//   6. Verifies the automation steps completed in correct order
//
// Run:
//   npx jest tests/e2e/fullPurchase.e2e.test.js --runInBand
//
// Prerequisites:
//   - Internet access to https://www.saucedemo.com
//   - Playwright browsers installed (npx playwright install chromium)
//   - .env configured (or defaults used)
// ═══════════════════════════════════════════════════════════════════

const { createAdapter } = require('../../src/automation/adapters/adapterFactory');
const fs = require('fs');
const path = require('path');

// ─── Helpers ────────────────────────────────────────────────────────

/** Collect step events emitted by adapter for later assertions */
function createStepCollector() {
  const steps = [];
  const onStep = (event) => {
    steps.push({
      step: event.step,
      status: event.status,
      durationMs: event.durationMs || null,
      error: event.error || null,
    });
  };
  return { steps, onStep };
}

/** Assert a file exists on disk and is not empty */
function expectFileOnDisk(filePath) {
  expect(typeof filePath).toBe('string');
  expect(filePath.length).toBeGreaterThan(0);
  expect(fs.existsSync(filePath)).toBe(true);

  const stat = fs.statSync(filePath);
  expect(stat.size).toBeGreaterThan(0);
}

/** Extract names of all completed steps (status = 'success') */
function completedStepNames(steps) {
  return steps
    .filter((s) => s.status === 'success')
    .map((s) => s.step);
}

// ─── Test Suite ─────────────────────────────────────────────────────

describe('E2E — Full Purchase Flow (Search → Cart → Checkout → Success)', () => {
  // Automation against a live site can take 30-60s
  jest.setTimeout(90_000);

  const SITE = 'saucedemo';
  let adapter;
  let allScreenshots = []; // track for cleanup logging

  beforeAll(() => {
    adapter = createAdapter(SITE);
  });

  // ─────────────────────────────────────────────────────────────────
  // TEST 1: Search returns valid, normalized products
  //
  // Covers: Steps 1-5 of the automation requirements
  //   Open browser → Login → Navigate → Search → Extract from DOM
  // ─────────────────────────────────────────────────────────────────
  test('Step 1-5: Search returns normalized products from live site', async () => {
    const { steps, onStep } = createStepCollector();

    const products = await adapter.search({
      query: 'Sauce',
      filters: {},
      requestId: 'e2e-search-001',
      onStep,
    });

    // ── Must return results ──
    expect(products.length).toBeGreaterThan(0);

    // ── Every product matches the normalized schema ──
    for (const p of products) {
      expect(p).toEqual(
        expect.objectContaining({
          id: expect.any(String),
          title: expect.any(String),
          price: expect.any(Number),
          currency: expect.any(String),
          source: expect.any(String),
        })
      );
      // price is a real number (not NaN, not negative)
      expect(Number.isFinite(p.price)).toBe(true);
      expect(p.price).toBeGreaterThanOrEqual(0);
      // title is trimmed (no leading/trailing whitespace)
      expect(p.title).toBe(p.title.trim());
    }

    // ── Steps were logged (observability) ──
    const names = completedStepNames(steps);
    expect(names).toContain('OpenBrowser');
    expect(names).toContain('Login');
    expect(names).toContain('SearchAndScrape');
  });

  // ─────────────────────────────────────────────────────────────────
  // TEST 2: maxPrice filter is applied correctly
  //
  // Covers: "Execute a search or apply filters based on the query"
  // ─────────────────────────────────────────────────────────────────
  test('Step 4: maxPrice filter returns only products within budget', async () => {
    const MAX = 15;

    const products = await adapter.search({
      query: '',
      filters: { maxPrice: MAX },
      requestId: 'e2e-search-002',
    });

    expect(products.length).toBeGreaterThan(0);
    for (const p of products) {
      expect(p.price).toBeLessThanOrEqual(MAX);
    }
  });

  // ─────────────────────────────────────────────────────────────────
  // TEST 3: ★ MAIN — Full purchase flow with screenshot proof
  //
  // THIS is the mandatory E2E test the assignment requires:
  //   Search → select product → Add to Cart → Checkout → Screenshot
  //
  // ★ SESSION CONTINUITY: After the refactoring, search() keeps the
  //   browser alive. purchase() reuses the SAME browser session —
  //   no second login, no re-navigation. The browser opens once,
  //   logs in once, and both operations share the session.
  //
  // Covers: ALL 10 automation steps + screenshot proof
  // ─────────────────────────────────────────────────────────────────
  test('Steps 1-10: Full purchase flow produces confirmation screenshot', async () => {
    // ── Phase 1: Search ──
    const products = await adapter.search({
      query: '',
      filters: { maxPrice: 20 },
      requestId: 'e2e-purchase-search',
    });
    expect(products.length).toBeGreaterThan(0);

    // Pick a specific product (not random — reproducible)
    const selected = products[0];
    console.log(`  ► Selected product: "${selected.title}" @ $${selected.price}`);

    // ── Phase 2: Purchase (Cart → Checkout → Confirm) ──
    const { steps, onStep } = createStepCollector();

    const result = await adapter.purchase({
      productTitle: selected.title,
      shipping: {
        firstName: 'E2E',
        lastName: 'TestUser',
        postalCode: '10001',
      },
      requestId: 'e2e-purchase-001',
      onStep,
    });

    // ── Assert: purchase completed ──
    expect(result).toBeDefined();
    expect(result.status).toBe('completed');

    // ── Assert: confirmation text from the site ──
    expect(result.confirmText).toBeTruthy();
    expect(result.confirmText.toLowerCase()).toMatch(/thank you|complete|order/);
    console.log(`  ► Confirmation: "${result.confirmText}"`);

    // ── Assert: price data was captured from DOM ──
    expect(result.subtotalText).toBeTruthy();
    expect(result.totalText).toBeTruthy();

    // ── Assert: steps completed in correct order (observability) ──
    const names = completedStepNames(steps);
    expect(names).toContain('OpenBrowser');
    expect(names).toContain('Login');
    expect(names).toContain('AddToCart');
    expect(names).toContain('Checkout');

    // Order matters: Login before AddToCart before Checkout
    const iLogin = names.indexOf('Login');
    const iCart = names.indexOf('AddToCart');
    const iCheckout = names.indexOf('Checkout');
    expect(iLogin).toBeLessThan(iCart);
    expect(iCart).toBeLessThan(iCheckout);

    // ── Assert: no step failed ──
    const failedStep = steps.find((s) => s.status === 'failed');
    if (failedStep) {
      console.error('  ✗ Failed step:', failedStep);
    }
    expect(failedStep).toBeUndefined();

    // ── Assert: screenshots exist on disk ──
    allScreenshots = [
      ...(result.cartScreenshots || []),
      ...(result.screenshots || []),
    ];
    expect(allScreenshots.length).toBeGreaterThan(0);
    console.log(`  ► Screenshots captured: ${allScreenshots.length}`);

    for (const screenshotPath of allScreenshots) {
      expectFileOnDisk(screenshotPath);
    }

    // ── ★ MANDATORY: confirmation screenshot (the "proof") ──
    // The assignment explicitly requires:
    //   "חובה לשמור Screenshot של מסך הרכישה כ-proof"
    const confirmationScreenshot = allScreenshots.find((s) =>
      /order-complete|6-order-complete|confirmation/i.test(path.basename(s))
    );
    expect(confirmationScreenshot).toBeDefined();
    expectFileOnDisk(confirmationScreenshot);

    console.log(`  ★ Confirmation proof: ${confirmationScreenshot}`);
  });

  // ─────────────────────────────────────────────────────────────────
  // TEST 4: Purchase with invalid shipping fails gracefully
  //
  // Covers: "Validate all input from the UI" + "error handling"
  // ─────────────────────────────────────────────────────────────────
  test('Robustness: missing shipping fields throws before launching browser', async () => {
    await expect(
      adapter.purchase({
        productTitle: 'Sauce Labs Onesie',
        shipping: { firstName: 'Only' }, // missing lastName, postalCode
        requestId: 'e2e-purchase-invalid',
      })
    ).rejects.toThrow(); // must throw, NOT open a browser and fail silently
  });

  // ─────────────────────────────────────────────────────────────────
  // TEST 5: Search with no results returns empty array (not crash)
  //
  // Covers: "Clear error handling with user-friendly messages"
  // ─────────────────────────────────────────────────────────────────
  test('Robustness: search for nonexistent product returns empty, not error', async () => {
    const products = await adapter.search({
      query: 'xyzNonExistentProduct999',
      filters: {},
      requestId: 'e2e-search-empty',
    });

    expect(Array.isArray(products)).toBe(true);
    expect(products.length).toBe(0);
  });

  // ─────────────────────────────────────────────────────────────────
  // TEST 6: Each step reports timing (observability requirement)
  //
  // Covers: "זמן ריצה לכל שלב" + "הצגת trace בסיסי"
  // ─────────────────────────────────────────────────────────────────
  test('Observability: every step reports durationMs', async () => {
    const { steps, onStep } = createStepCollector();

    await adapter.search({
      query: '',
      filters: {},
      requestId: 'e2e-observability-001',
      onStep,
    });

    // Only check completed steps (not 'running' events)
    const completed = steps.filter((s) => s.status === 'success');
    expect(completed.length).toBeGreaterThan(0);

    for (const s of completed) {
      expect(typeof s.durationMs).toBe('number');
      expect(s.durationMs).toBeGreaterThanOrEqual(0);
    }
  });
});
