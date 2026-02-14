// tests/domain/Order.test.js

const { createOrder } = require('../../src/domain/Order');

describe('Order Model', () => {
  // ── Successful order ──
  const order = createOrder({
    requestId: 'req-001',
    product: { id: 'onesie', title: 'Onesie', price: 7.99 },
    shipping: { firstName: 'Test', lastName: 'User', postalCode: '12345' },
    status: 'completed',
    confirmText: 'Thank you for your order!',
    totalText: 'Total: $7.99',
    screenshots: ['screenshots/proof.png'],
    steps: [{ step: 'Login', status: 'success', durationMs: 3200 }],
    cartValidation: { breakdown: { subtotal: 7.99, tax: 0, total: 7.99 }, fromSite: 7.99, match: true },
  });

  describe('successful order fields', () => {
    test('requestId = req-001', () => {
      expect(order.requestId).toBe('req-001');
    });

    test('status = completed', () => {
      expect(order.status).toBe('completed');
    });

    test('product.title = Onesie', () => {
      expect(order.product.title).toBe('Onesie');
    });

    test('shipping.firstName = Test', () => {
      expect(order.shipping.firstName).toBe('Test');
    });

    test('confirmText set', () => {
      expect(order.confirmText).toBe('Thank you for your order!');
    });

    test('totalText set', () => {
      expect(order.totalText).toBe('Total: $7.99');
    });

    test('screenshots length = 1', () => {
      expect(order.screenshots).toHaveLength(1);
    });

    test('steps length = 1', () => {
      expect(order.steps).toHaveLength(1);
    });

    test('cartValidation.match = true', () => {
      expect(order.cartValidation.match).toBe(true);
    });

    test('cartValidation.breakdown.tax = 0', () => {
      expect(order.cartValidation.breakdown.tax).toBe(0);
    });

    test('createdAt exists', () => {
      expect(typeof order.createdAt).toBe('string');
    });

    test('error = null', () => {
      expect(order.error).toBeNull();
    });
  });

  // ── Object.freeze — immutability ──
  describe('immutability (Object.freeze)', () => {
    test('status cannot be changed', () => {
      try { order.status = 'failed'; } catch (_) {}
      expect(order.status).toBe('completed');
    });

    test('screenshots array cannot be mutated', () => {
      try { order.screenshots.push('hack.png'); } catch (_) {}
      expect(order.screenshots).toHaveLength(1);
    });

    test('steps array cannot be mutated', () => {
      try { order.steps.push({ step: 'Hack' }); } catch (_) {}
      expect(order.steps).toHaveLength(1);
    });
  });

  // ── Failed order ──
  describe('failed order', () => {
    const failedOrder = createOrder({
      requestId: 'req-002',
      status: 'failed',
      error: 'Add to cart failed after 3 attempts',
    });

    test('status = failed', () => {
      expect(failedOrder.status).toBe('failed');
    });

    test('error set', () => {
      expect(failedOrder.error).toContain('3 attempts');
    });

    test('product = null', () => {
      expect(failedOrder.product).toBeNull();
    });

    test('shipping = null', () => {
      expect(failedOrder.shipping).toBeNull();
    });

    test('screenshots = []', () => {
      expect(failedOrder.screenshots).toHaveLength(0);
    });

    test('cartValidation = null', () => {
      expect(failedOrder.cartValidation).toBeNull();
    });
  });

  // ── Defaults ──
  describe('defaults', () => {
    const minimal = createOrder({ requestId: 'req-003', status: 'completed' });

    test('confirmText = null', () => {
      expect(minimal.confirmText).toBeNull();
    });

    test('totalText = null', () => {
      expect(minimal.totalText).toBeNull();
    });

    test('screenshots = []', () => {
      expect(minimal.screenshots).toHaveLength(0);
    });

    test('steps = []', () => {
      expect(minimal.steps).toHaveLength(0);
    });

    test('error = null', () => {
      expect(minimal.error).toBeNull();
    });
  });

  // ── Fail Fast ──
  describe('Fail Fast validation', () => {
    test('missing requestId throws', () => {
      expect(() => createOrder({ status: 'completed' }))
        .toThrow('requestId is required');
    });

    test('missing status throws', () => {
      expect(() => createOrder({ requestId: 'req-004' }))
        .toThrow('status is required');
    });
  });

  // ── JSON serializable ──
  describe('JSON serialization', () => {
    const parsed = JSON.parse(JSON.stringify(order));

    test('requestId survives serialization', () => {
      expect(parsed.requestId).toBe('req-001');
    });

    test('cartValidation.match survives serialization', () => {
      expect(parsed.cartValidation.match).toBe(true);
    });
  });
});
