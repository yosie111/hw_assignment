// tests/unit/cartCalculator.test.js

const { calculateCart, validateCartTotal, DEFAULT_TAX_RATE } = require('../../src/domain/CartCalculator');

describe('CartCalculator', () => {
  // ★ G4: Cart calculation tests (tax = 0%)

  test('single item: $29.99 → subtotal: 29.99, tax: 0, total: 29.99', () => {
    const result = calculateCart([{ price: 29.99 }]);
    expect(result.subtotal).toBe(29.99);
    expect(result.tax).toBe(0);
    expect(result.total).toBe(29.99);
  });

  test('two items: $29.99 + $9.99 → subtotal: 39.98, tax: 0, total: 39.98', () => {
    const result = calculateCart([{ price: 29.99 }, { price: 9.99 }]);
    expect(result.subtotal).toBe(39.98);
    expect(result.tax).toBe(0);
    expect(result.total).toBe(39.98);
  });

  test('empty array → throws Error', () => {
    expect(() => calculateCart([])).toThrow();
  });

  test('negative price → does not throw (no per-item sign validation)', () => {
    const result = calculateCart([{ price: -5 }]);
    expect(result.subtotal).toBe(-5);
  });

  test('DEFAULT_TAX_RATE is 0', () => {
    expect(DEFAULT_TAX_RATE).toBe(0);
  });
});

describe('validateCartTotal', () => {
  test('matching values → match: true', () => {
    const result = validateCartTotal(29.99, 'Total: $29.99');
    expect(result.match).toBe(true);
    expect(result.calculated).toBe(29.99);
    expect(result.fromSite).toBe(29.99);
  });

  test('mismatched total → match: false', () => {
    const result = validateCartTotal(29.99, 'Total: $99.99');
    expect(result.match).toBe(false);
  });

  test('within tolerance (±0.01) → match: true', () => {
    const result = validateCartTotal(29.99, 'Total: $30.00');
    expect(result.match).toBe(true);
  });

  test('parse dollar sign format', () => {
    const result = validateCartTotal(8.63, '$8.63');
    expect(result.match).toBe(true);
  });
});
