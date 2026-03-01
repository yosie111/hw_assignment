// tests/services/purchaseService.test.js
//
// ★ DI in action: NO jest.mock needed!
//   FakeAdapter replaces real automation — tests run instantly without Playwright.

const { FakeAdapter } = require('../../src/automation/adapters/FakeAdapter');
const { executePurchase, getStatus, _runPurchase } = require('../../src/services/purchaseService');
const statusStore = require('../../src/services/statusStore');

// Helper: valid product (frozen, as Domain would return)
const validProduct = (overrides = {}) => Object.freeze({
  id: 'sauce-labs-onesie',
  title: 'Sauce Labs Onesie',
  price: 7.99,
  currency: 'USD',
  productUrl: 'https://www.saucedemo.com/inventory-item.html?id=2',
  imageUrl: '/static/media/sauce-onesie.jpg',
  source: 'Saucedemo',
  ...overrides,
});

// Helper: valid shipping
const validShipping = (overrides = {}) => ({
  firstName: 'John',
  lastName: 'Doe',
  postalCode: '12345',
  ...overrides,
});

describe('purchaseService', () => {
  let adapter;

  beforeEach(() => {
    statusStore._clear();
    adapter = new FakeAdapter();
  });

  // ===== executePurchase — Fail Fast validation =====
  describe('executePurchase() — input validation (Fail Fast)', () => {
    test('throws when product is missing', async () => {
      await expect(
        executePurchase(adapter, { product: null, shipping: validShipping() })
      ).rejects.toThrow('Valid product with title is required');
    });

    test('throws when product.title is missing', async () => {
      await expect(
        executePurchase(adapter, { product: { price: 7.99 }, shipping: validShipping() })
      ).rejects.toThrow('Valid product with title is required');
    });

    test('throws when shipping is missing', async () => {
      await expect(
        executePurchase(adapter, { product: validProduct(), shipping: null })
      ).rejects.toThrow('Complete shipping details required');
    });

    test('throws when shipping.firstName is missing', async () => {
      await expect(
        executePurchase(adapter, {
          product: validProduct(),
          shipping: { lastName: 'Doe', postalCode: '12345' },
        })
      ).rejects.toThrow('Complete shipping details required');
    });

    test('throws when shipping.lastName is missing', async () => {
      await expect(
        executePurchase(adapter, {
          product: validProduct(),
          shipping: { firstName: 'John', postalCode: '12345' },
        })
      ).rejects.toThrow('Complete shipping details required');
    });

    test('throws when shipping.postalCode is missing', async () => {
      await expect(
        executePurchase(adapter, {
          product: validProduct(),
          shipping: { firstName: 'John', lastName: 'Doe' },
        })
      ).rejects.toThrow('Complete shipping details required');
    });
  });

  // ===== executePurchase — Fire-and-Forget =====
  describe('executePurchase() — Fire-and-Forget', () => {
    test('returns requestId immediately', async () => {
      const result = await executePurchase(adapter, {
        product: validProduct(),
        shipping: validShipping(),
      });

      expect(result.requestId).toBeDefined();
      expect(typeof result.requestId).toBe('string');
    });

    test('creates status entry in statusStore', async () => {
      const { requestId } = await executePurchase(adapter, {
        product: validProduct(),
        shipping: validShipping(),
      });

      const status = statusStore.get(requestId);
      expect(status).not.toBeNull();
      expect(status.type).toBe('purchase');
    });
  });

  // ===== _runPurchase — successful purchase =====
  describe('_runPurchase() — successful purchase', () => {
    test('completes statusStore with Order on success', async () => {
      const requestId = 'test-success-1';
      statusStore.create(requestId, 'purchase');

      await _runPurchase(adapter, {
        product: validProduct(),
        shipping: validShipping(),
        requestId,
      });

      const status = statusStore.get(requestId);
      expect(status.status).toBe('completed');
      expect(status.result).toBeDefined();
      expect(status.result.status).toBe('completed');
      expect(status.result.confirmText).toBe('Thank you for your order!');
    });

    test('adapter receives correct params', async () => {
      const product = validProduct();
      const shipping = validShipping();
      const requestId = 'test-params';
      statusStore.create(requestId, 'purchase');

      await _runPurchase(adapter, { product, shipping, requestId });

      expect(adapter.purchaseCalls).toHaveLength(1);
      expect(adapter.purchaseCalls[0].productTitle).toBe('Sauce Labs Onesie');
      expect(adapter.purchaseCalls[0].shipping).toEqual(shipping);
      expect(adapter.purchaseCalls[0].requestId).toBe(requestId);
    });

    test('records onStep events during purchase', async () => {
      const requestId = 'test-steps';
      statusStore.create(requestId, 'purchase');

      await _runPurchase(adapter, {
        product: validProduct(),
        shipping: validShipping(),
        requestId,
      });

      const status = statusStore.get(requestId);
      // FakeAdapter emits 4 steps: OpenBrowser, Login, AddToCart, Checkout
      expect(status.steps.length).toBeGreaterThanOrEqual(4);
      expect(status.steps[0].step).toBe('OpenBrowser');
    });
  });

  // ===== _runPurchase — Oracle Reconciliation =====
  describe('_runPurchase() — Oracle Reconciliation', () => {
    test('calculates cartValidation with matching subtotals', async () => {
      adapter.setPurchaseResult({
        status: 'completed',
        confirmText: 'Thank you for your order!',
        subtotalText: 'Item total: $7.99',
        taxText: 'Tax: $0.64',
        totalText: 'Total: $8.63',
        cartScreenshots: ['screenshots/3-cart-page.png'],
        screenshots: ['screenshots/5-order-overview.png', 'screenshots/6-order-complete.png'],
        steps: [
          { step: 'Login', status: 'completed', durationMs: 1200 },
          { step: 'AddToCart', status: 'completed', durationMs: 2000 },
          { step: 'Checkout', status: 'completed', durationMs: 3000 },
        ],
        lastStep: 'Checkout',
        requestId: null,
      });

      const requestId = 'test-oracle-match';
      statusStore.create(requestId, 'purchase');

      await _runPurchase(adapter, {
        product: validProduct({ price: 7.99 }),
        shipping: validShipping(),
        requestId,
      });

      const status = statusStore.get(requestId);
      const order = status.result;

      expect(order.cartValidation).toBeDefined();
      expect(order.cartValidation.breakdown.subtotal).toBe(7.99);
      expect(order.cartValidation.site.subtotal).toBe(7.99);
      expect(order.cartValidation.match).toBe(true);
    });

    test('detects mismatch and logs warning (does not block)', async () => {
      const warnSpy = jest.spyOn(console, 'warn').mockImplementation();

      // Site subtotal $9.99 but product price is $7.99 → mismatch
      adapter.setPurchaseResult({
        status: 'completed',
        confirmText: 'Thank you!',
        subtotalText: 'Item total: $9.99',
        taxText: 'Tax: $0.80',
        totalText: 'Total: $10.79',
        cartScreenshots: [],
        screenshots: [],
        steps: [],
        lastStep: 'Checkout',
        requestId: null,
      });

      const requestId = 'test-oracle-mismatch';
      statusStore.create(requestId, 'purchase');

      await _runPurchase(adapter, {
        product: validProduct({ price: 7.99 }),
        shipping: validShipping(),
        requestId,
      });

      const status = statusStore.get(requestId);
      expect(status.status).toBe('completed');
      expect(status.result.cartValidation.match).toBe(false);
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('Cart subtotal mismatch')
      );

      warnSpy.mockRestore();
    });
  });

  // ===== _runPurchase — failed purchase =====
  describe('_runPurchase() — automation failure', () => {
    test('marks statusStore as failed when adapter returns failure', async () => {
      adapter.setPurchaseResult({
        status: 'failed',
        error: 'Product not found on page',
        screenshotPath: 'screenshots/ERROR.png',
        steps: [
          { step: 'Login', status: 'completed', durationMs: 1200 },
          { step: 'AddToCart', status: 'failed', error: 'Product not found' },
        ],
        lastStep: 'AddToCart',
        requestId: null,
      });

      const requestId = 'test-fail-1';
      statusStore.create(requestId, 'purchase');

      await _runPurchase(adapter, {
        product: validProduct(),
        shipping: validShipping(),
        requestId,
      });

      const status = statusStore.get(requestId);
      expect(status.status).toBe('failed');
      expect(status.error).toBe('Product not found on page');
    });
  });

  // ===== _runPurchase — unexpected errors =====
  describe('_runPurchase() — unexpected errors', () => {
    test('catches and records unexpected adapter crash', async () => {
      adapter.setPurchaseError(new Error('Browser crashed unexpectedly'));

      const requestId = 'test-crash';
      statusStore.create(requestId, 'purchase');

      await _runPurchase(adapter, {
        product: validProduct(),
        shipping: validShipping(),
        requestId,
      });

      const status = statusStore.get(requestId);
      expect(status.status).toBe('failed');
      expect(status.error).toBe('Browser crashed unexpectedly');
    });
  });

  // ===== Screenshots collection =====
  describe('screenshot collection', () => {
    test('collects both cartScreenshots and checkout screenshots', async () => {
      adapter.setPurchaseResult({
        status: 'completed',
        confirmText: 'Done!',
        subtotalText: '$7.99',
        taxText: '$0',
        totalText: '$7.99',
        cartScreenshots: ['cart1.png', 'cart2.png'],
        screenshots: ['overview.png', 'complete.png'],
        steps: [],
        lastStep: 'Checkout',
        requestId: null,
      });

      const requestId = 'test-screenshots';
      statusStore.create(requestId, 'purchase');

      await _runPurchase(adapter, {
        product: validProduct(),
        shipping: validShipping(),
        requestId,
      });

      const order = statusStore.get(requestId).result;
      expect(order.screenshots).toHaveLength(4);
      expect(order.screenshots).toContain('cart1.png');
      expect(order.screenshots).toContain('complete.png');
    });
  });

  // ===== getStatus =====
  describe('getStatus()', () => {
    test('returns null for unknown requestId', () => {
      expect(getStatus('unknown')).toBeNull();
    });

    test('returns status for existing request', async () => {
      const { requestId } = await executePurchase(adapter, {
        product: validProduct(),
        shipping: validShipping(),
      });

      const status = getStatus(requestId);
      expect(status).not.toBeNull();
      expect(status.requestId).toBe(requestId);
    });
  });

  // ===== Order structure (DDD Aggregate) =====
  describe('Order structure (DDD Aggregate)', () => {
    test('completed Order has all required fields', async () => {
      const requestId = 'test-order-fields';
      statusStore.create(requestId, 'purchase');

      await _runPurchase(adapter, {
        product: validProduct(),
        shipping: validShipping(),
        requestId,
      });

      const order = statusStore.get(requestId).result;

      expect(order.requestId).toBe(requestId);
      expect(order.product).toBeDefined();
      expect(order.shipping).toBeDefined();
      expect(order.status).toBe('completed');
      expect(order.confirmText).toBe('Thank you for your order!');
      expect(order.screenshots).toBeDefined();
      expect(order.steps).toBeDefined();
      expect(order.cartValidation).toBeDefined();
      expect(order.createdAt).toBeDefined();
    });

    test('Order is frozen (immutable)', async () => {
      const requestId = 'test-order-frozen';
      statusStore.create(requestId, 'purchase');

      await _runPurchase(adapter, {
        product: validProduct(),
        shipping: validShipping(),
        requestId,
      });

      const order = statusStore.get(requestId).result;
      expect(Object.isFrozen(order)).toBe(true);
    });
  });

  // ===== DI proof: different adapter configurations =====
  describe('DI proof — adapter behavior controls purchase output', () => {
    test('custom adapter failure result propagates to statusStore', async () => {
      const failAdapter = new FakeAdapter({
        purchaseResult: {
          status: 'failed',
          error: 'Custom error from test adapter',
          screenshotPath: null,
          steps: [],
          lastStep: 'Login',
          requestId: null,
        },
      });

      const requestId = 'test-custom-fail';
      statusStore.create(requestId, 'purchase');

      await _runPurchase(failAdapter, {
        product: validProduct(),
        shipping: validShipping(),
        requestId,
      });

      const status = statusStore.get(requestId);
      expect(status.status).toBe('failed');
      expect(status.error).toBe('Custom error from test adapter');
    });
  });
});
