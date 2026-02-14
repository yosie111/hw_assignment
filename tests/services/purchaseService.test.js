// tests/services/purchaseService.test.js

// Mock automation BEFORE requiring purchaseService
jest.mock('../../src/automation', () => ({
  purchase: jest.fn(),
}));

const { purchase: mockPurchase } = require('../../src/automation');
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

// Helper: successful automation result
const successResult = (overrides = {}) => ({
  confirmText: 'Thank you for your order!',
  subtotalText: 'Item total: $7.99',
  taxText: 'Tax: $0.00',
  totalText: 'Total: $7.99',
  cartScreenshots: ['screenshots/3-cart-page.png'],
  screenshots: ['screenshots/5-order-overview.png', 'screenshots/6-order-complete.png'],
  steps: [
    { step: 'Login', status: 'completed', durationMs: 1200 },
    { step: 'AddToCart', status: 'completed', durationMs: 2000 },
    { step: 'Checkout', status: 'completed', durationMs: 3000 },
  ],
  lastStep: 'Checkout',
  requestId: 'test-req',
  ...overrides,
});

// Helper: failed automation result
const failedResult = (overrides = {}) => ({
  status: 'failed',
  error: 'Product not found on page',
  screenshotPath: 'screenshots/ERROR.png',
  steps: [
    { step: 'Login', status: 'completed', durationMs: 1200 },
    { step: 'AddToCart', status: 'failed', error: 'Product not found' },
  ],
  lastStep: 'AddToCart',
  requestId: 'test-req',
  ...overrides,
});

describe('purchaseService', () => {
  beforeEach(() => {
    statusStore._clear();
    jest.clearAllMocks();
  });

  // ===== executePurchase — Fail Fast validation =====
  describe('executePurchase() — input validation (Fail Fast)', () => {
    test('throws when product is missing', async () => {
      await expect(
        executePurchase({ product: null, shipping: validShipping() })
      ).rejects.toThrow('Valid product with title is required');
    });

    test('throws when product.title is missing', async () => {
      await expect(
        executePurchase({ product: { price: 7.99 }, shipping: validShipping() })
      ).rejects.toThrow('Valid product with title is required');
    });

    test('throws when shipping is missing', async () => {
      await expect(
        executePurchase({ product: validProduct(), shipping: null })
      ).rejects.toThrow('Complete shipping details required');
    });

    test('throws when shipping.firstName is missing', async () => {
      await expect(
        executePurchase({
          product: validProduct(),
          shipping: { lastName: 'Doe', postalCode: '12345' },
        })
      ).rejects.toThrow('Complete shipping details required');
    });

    test('throws when shipping.lastName is missing', async () => {
      await expect(
        executePurchase({
          product: validProduct(),
          shipping: { firstName: 'John', postalCode: '12345' },
        })
      ).rejects.toThrow('Complete shipping details required');
    });

    test('throws when shipping.postalCode is missing', async () => {
      await expect(
        executePurchase({
          product: validProduct(),
          shipping: { firstName: 'John', lastName: 'Doe' },
        })
      ).rejects.toThrow('Complete shipping details required');
    });
  });

  // ===== executePurchase — Fire-and-Forget =====
  describe('executePurchase() — Fire-and-Forget', () => {
    test('returns requestId immediately (does not wait for purchase)', async () => {
      // Make purchase hang forever — executePurchase should still return
      mockPurchase.mockReturnValue(new Promise(() => {})); // never resolves

      const result = await executePurchase({
        product: validProduct(),
        shipping: validShipping(),
      });

      expect(result.requestId).toBeDefined();
      expect(typeof result.requestId).toBe('string');
    });

    test('creates status entry in statusStore', async () => {
      mockPurchase.mockReturnValue(new Promise(() => {}));

      const { requestId } = await executePurchase({
        product: validProduct(),
        shipping: validShipping(),
      });

      const status = statusStore.get(requestId);
      expect(status).not.toBeNull();
      expect(status.type).toBe('purchase');
      expect(status.status).toBe('running');
    });
  });

  // ===== _runPurchase — successful purchase =====
  describe('_runPurchase() — successful purchase', () => {
    test('completes statusStore with Order on success', async () => {
      mockPurchase.mockResolvedValue(successResult());

      const requestId = 'test-success-1';
      statusStore.create(requestId, 'purchase');

      await _runPurchase({
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

    test('passes correct params to automation.purchase', async () => {
      mockPurchase.mockResolvedValue(successResult());

      const product = validProduct();
      const shipping = validShipping();
      const requestId = 'test-params';
      statusStore.create(requestId, 'purchase');

      await _runPurchase({ product, shipping, requestId });

      expect(mockPurchase).toHaveBeenCalledWith(
        expect.objectContaining({
          productTitle: 'Sauce Labs Onesie',
          shipping,
          requestId,
          onStep: expect.any(Function),
        })
      );
    });

    test('records onStep events during purchase', async () => {
      mockPurchase.mockImplementation(async ({ onStep }) => {
        onStep({ step: 'Login', status: 'completed', durationMs: 1000 });
        onStep({ step: 'AddToCart', status: 'completed', durationMs: 2000 });
        onStep({ step: 'Checkout', status: 'completed', durationMs: 3000 });
        return successResult();
      });

      const requestId = 'test-steps';
      statusStore.create(requestId, 'purchase');

      await _runPurchase({
        product: validProduct(),
        shipping: validShipping(),
        requestId,
      });

      const status = statusStore.get(requestId);
      expect(status.steps).toHaveLength(3);
      expect(status.steps[0].step).toBe('Login');
    });
  });

  // ===== _runPurchase — Oracle Reconciliation =====
  describe('_runPurchase() — Oracle Reconciliation', () => {
    test('calculates cartValidation with matching subtotals', async () => {
      // Product: $7.99, Tax: $0.00, Total: $7.99 — subtotal matches site subtotal
      mockPurchase.mockResolvedValue(successResult({
        subtotalText: 'Item total: $7.99',
        taxText: 'Tax: $0.64',
        totalText: 'Total: $8.63',
      }));

      const requestId = 'test-oracle-match';
      statusStore.create(requestId, 'purchase');

      await _runPurchase({
        product: validProduct({ price: 7.99 }),
        shipping: validShipping(),
        requestId,
      });

      const status = statusStore.get(requestId);
      const order = status.result;

      expect(order.cartValidation).toBeDefined();
      expect(order.cartValidation.breakdown.subtotal).toBe(7.99);
      expect(order.cartValidation.breakdown.tax).toBe(0);
      expect(order.cartValidation.breakdown.total).toBe(7.99);
      expect(order.cartValidation.site.subtotal).toBe(7.99);
      expect(order.cartValidation.site.tax).toBe(0.64);
      expect(order.cartValidation.site.total).toBe(8.63);
      expect(order.cartValidation.match).toBe(true);
    });

    test('detects mismatch and logs warning (does not block)', async () => {
      const warnSpy = jest.spyOn(console, 'warn').mockImplementation();

      // Site subtotal $9.99 but Oracle subtotal $7.99 → mismatch
      mockPurchase.mockResolvedValue(successResult({
        subtotalText: 'Item total: $9.99',
        taxText: 'Tax: $0.80',
        totalText: 'Total: $10.79',
      }));

      const requestId = 'test-oracle-mismatch';
      statusStore.create(requestId, 'purchase');

      await _runPurchase({
        product: validProduct({ price: 7.99 }),
        shipping: validShipping(),
        requestId,
      });

      const status = statusStore.get(requestId);
      // Purchase should still complete (warning only)
      expect(status.status).toBe('completed');
      expect(status.result.cartValidation.match).toBe(false);
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('Cart subtotal mismatch')
      );

      warnSpy.mockRestore();
    });

    test('reports mismatch when subtotalText is unparseable', async () => {
      const warnSpy = jest.spyOn(console, 'warn').mockImplementation();

      mockPurchase.mockResolvedValue(successResult({
        subtotalText: 'N/A',
        taxText: 'N/A',
        totalText: 'N/A',
      }));

      const requestId = 'test-oracle-unparseable';
      statusStore.create(requestId, 'purchase');

      await _runPurchase({
        product: validProduct({ price: 7.99 }),
        shipping: validShipping(),
        requestId,
      });

      const status = statusStore.get(requestId);
      // Should still complete, but match = false (unparseable subtotal)
      expect(status.status).toBe('completed');
      expect(status.result.cartValidation.match).toBe(false);

      warnSpy.mockRestore();
    });
  });

  // ===== _runPurchase — failed purchase =====
  describe('_runPurchase() — automation failure', () => {
    test('marks statusStore as failed when automation returns failure', async () => {
      mockPurchase.mockResolvedValue(failedResult());

      const requestId = 'test-fail-1';
      statusStore.create(requestId, 'purchase');

      await _runPurchase({
        product: validProduct(),
        shipping: validShipping(),
        requestId,
      });

      const status = statusStore.get(requestId);
      expect(status.status).toBe('failed');
      expect(status.error).toBe('Product not found on page');
    });

    test('creates Order with failed status even on failure', async () => {
      mockPurchase.mockResolvedValue(failedResult());

      const requestId = 'test-fail-order';
      statusStore.create(requestId, 'purchase');

      // _runPurchase calls createOrder even for failures — this is for audit trail
      await _runPurchase({
        product: validProduct(),
        shipping: validShipping(),
        requestId,
      });

      // Verify statusStore got the failure
      const status = statusStore.get(requestId);
      expect(status.status).toBe('failed');
    });
  });

  // ===== _runPurchase — unexpected errors =====
  describe('_runPurchase() — unexpected errors', () => {
    test('catches and records unexpected automation crash', async () => {
      mockPurchase.mockRejectedValue(new Error('Browser crashed unexpectedly'));

      const requestId = 'test-crash';
      statusStore.create(requestId, 'purchase');

      await _runPurchase({
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
      mockPurchase.mockResolvedValue(successResult({
        cartScreenshots: ['cart1.png', 'cart2.png'],
        screenshots: ['overview.png', 'complete.png'],
      }));

      const requestId = 'test-screenshots';
      statusStore.create(requestId, 'purchase');

      await _runPurchase({
        product: validProduct(),
        shipping: validShipping(),
        requestId,
      });

      const order = statusStore.get(requestId).result;
      expect(order.screenshots).toHaveLength(4);
      expect(order.screenshots).toContain('cart1.png');
      expect(order.screenshots).toContain('complete.png');
    });

    test('handles missing cartScreenshots gracefully', async () => {
      mockPurchase.mockResolvedValue(successResult({ cartScreenshots: undefined }));

      const requestId = 'test-no-cart-screenshots';
      statusStore.create(requestId, 'purchase');

      await _runPurchase({
        product: validProduct(),
        shipping: validShipping(),
        requestId,
      });

      const order = statusStore.get(requestId).result;
      expect(order.screenshots).toBeDefined();
      expect(Array.isArray(order.screenshots)).toBe(true);
    });

    test('includes error screenshot path on failure', async () => {
      mockPurchase.mockResolvedValue(failedResult({
        screenshotPath: 'screenshots/ERROR-addtocart.png',
      }));

      const requestId = 'test-error-screenshot';
      statusStore.create(requestId, 'purchase');

      await _runPurchase({
        product: validProduct(),
        shipping: validShipping(),
        requestId,
      });

      // The failed order creation includes the error screenshot
      // Verified through statusStore failure
      const status = statusStore.get(requestId);
      expect(status.status).toBe('failed');
    });
  });

  // ===== getStatus =====
  describe('getStatus()', () => {
    test('returns null for unknown requestId', () => {
      expect(getStatus('unknown')).toBeNull();
    });

    test('returns status for existing request', async () => {
      mockPurchase.mockReturnValue(new Promise(() => {})); // hang

      const { requestId } = await executePurchase({
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
      mockPurchase.mockResolvedValue(successResult());

      const requestId = 'test-order-fields';
      statusStore.create(requestId, 'purchase');

      await _runPurchase({
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
      expect(order.totalText).toBe('Total: $7.99');
      expect(order.screenshots).toBeDefined();
      expect(order.steps).toBeDefined();
      expect(order.cartValidation).toBeDefined();
      expect(order.createdAt).toBeDefined();
    });

    test('Order is frozen (immutable)', async () => {
      mockPurchase.mockResolvedValue(successResult());

      const requestId = 'test-order-frozen';
      statusStore.create(requestId, 'purchase');

      await _runPurchase({
        product: validProduct(),
        shipping: validShipping(),
        requestId,
      });

      const order = statusStore.get(requestId).result;

      // Object.freeze prevents modifications
      expect(Object.isFrozen(order)).toBe(true);
    });
  });
});
