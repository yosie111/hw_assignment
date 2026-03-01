// src/automation/adapters/FakeAdapter.js
//
// Deterministic adapter for unit/integration tests.
// No Playwright, no browser, no network — pure in-memory.
//
// Usage in tests:
//   const adapter = new FakeAdapter();                // default products
//   const adapter = new FakeAdapter({ products });    // custom products
//   adapter.setPurchaseResult({ status: 'failed' });  // override purchase behavior
//   adapter.setSearchError(new Error('boom'));         // force search to throw
//
// This proves the value of DI:
//   searchService + purchaseService can be tested WITHOUT automation.

const { SiteAdapter } = require('./SiteAdapter');

// ─── Default fake data ───

const DEFAULT_PRODUCTS = [
  {
    id: 'fake-001',
    title: 'Fake Product A',
    price: 9.99,
    currency: 'USD',
    productUrl: 'https://fake.test/product/001',
    imageUrl: 'https://fake.test/img/001.png',
    source: 'FakeStore',
  },
  {
    id: 'fake-002',
    title: 'Fake Product B',
    price: 24.99,
    currency: 'USD',
    productUrl: 'https://fake.test/product/002',
    imageUrl: 'https://fake.test/img/002.png',
    source: 'FakeStore',
  },
  {
    id: 'fake-003',
    title: 'Fake Product C',
    price: 49.99,
    currency: 'USD',
    productUrl: 'https://fake.test/product/003',
    imageUrl: 'https://fake.test/img/003.png',
    source: 'FakeStore',
  },
];

const DEFAULT_PURCHASE_RESULT = {
  status: 'completed',
  confirmText: 'Thank you for your order!',
  subtotalText: 'Item total: $9.99',
  taxText: 'Tax: $0.00',
  totalText: 'Total: $9.99',
  cartScreenshots: ['screenshots/fake-cart.png'],
  screenshots: ['screenshots/fake-overview.png', 'screenshots/fake-complete.png'],
  lastStep: 'Checkout',
  requestId: null, // filled dynamically
  steps: [
    { step: 'OpenBrowser', status: 'completed', durationMs: 10 },
    { step: 'Login', status: 'completed', durationMs: 20 },
    { step: 'AddToCart', status: 'completed', durationMs: 30 },
    { step: 'Checkout', status: 'completed', durationMs: 40 },
  ],
};

class FakeAdapter extends SiteAdapter {
  /**
   * @param {Object} [options]
   * @param {Object[]} [options.products]       - Custom product list
   * @param {Object}   [options.purchaseResult] - Custom purchase result
   */
  constructor(options = {}) {
    super();
    this._products = options.products || DEFAULT_PRODUCTS;
    this._purchaseResult = options.purchaseResult || DEFAULT_PURCHASE_RESULT;
    this._searchError = null;
    this._purchaseError = null;

    // Spy-friendly: track all calls
    this.searchCalls = [];
    this.purchaseCalls = [];
  }

  get name() {
    return 'fake';
  }

  // ─── Configuration helpers (for tests) ───

  /** Override the products that search() returns */
  setProducts(products) {
    this._products = products;
  }

  /** Force search() to throw */
  setSearchError(error) {
    this._searchError = error;
  }

  /** Override the result that purchase() returns */
  setPurchaseResult(result) {
    this._purchaseResult = result;
  }

  /** Force purchase() to throw (unrecoverable crash) */
  setPurchaseError(error) {
    this._purchaseError = error;
  }

  // ─── SiteAdapter implementation ───

  async search({ query, filters, requestId, onStep }) {
    this.searchCalls.push({ query, filters, requestId });

    // Simulate step callbacks (like real adapters do)
    if (onStep) {
      onStep({ step: 'OpenBrowser', status: 'completed', durationMs: 5 });
      onStep({ step: 'Login', status: 'completed', durationMs: 10 });
      onStep({ step: 'SearchAndScrape', status: 'completed', durationMs: 15 });
    }

    if (this._searchError) {
      throw this._searchError;
    }

    // Client-side filtering (mirrors real adapter behavior)
    let results = [...this._products];

    if (query && query.trim()) {
      const q = query.toLowerCase();
      results = results.filter(p => p.title.toLowerCase().includes(q));
    }

    if (filters?.maxPrice != null) {
      results = results.filter(p => p.price <= filters.maxPrice);
    }

    return results;
  }

  async purchase({ productTitle, shipping, requestId, onStep }) {
    this.purchaseCalls.push({ productTitle, shipping, requestId });

    // Simulate step callbacks
    if (onStep) {
      for (const step of (this._purchaseResult.steps || [])) {
        onStep({ step: step.step, status: step.status, durationMs: step.durationMs });
      }
    }

    if (this._purchaseError) {
      throw this._purchaseError;
    }

    return {
      ...this._purchaseResult,
      requestId: requestId || this._purchaseResult.requestId,
    };
  }
}

module.exports = { FakeAdapter, DEFAULT_PRODUCTS, DEFAULT_PURCHASE_RESULT };
