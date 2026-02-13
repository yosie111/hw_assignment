// tests/unit/cartCalculator.test.js

const { calculateCart, validateCartTotal, TAX_RATE } = require('../../src/domain/CartCalculator');

describe('CartCalculator', () => {
  // ★ G4: Cart calculation tests

  test('single item: $29.99 → subtotal: 29.99, tax: 2.40, total: 32.39', () => {
    const result = calculateCart([{ price: 29.99 }]);
    expect(result.subtotal).toBe(29.99);
    expect(result.tax).toBe(2.40);
    expect(result.total).toBe(32.39);
  });

  test('two items: $29.99 + $9.99 → subtotal: 39.98, tax: 3.20, total: 43.18', () => {
    const result = calculateCart([{ price: 29.99 }, { price: 9.99 }]);
    expect(result.subtotal).toBe(39.98);
    expect(result.tax).toBe(3.20);
    expect(result.total).toBe(43.18);
  });

  test('empty array → throws Error', () => {
    expect(() => calculateCart([])).toThrow('no products provided');
  });

  test('negative price → does not throw (no per-item sign validation)', () => {
    // CartCalculator validates type (number, not NaN) but not sign
    const result = calculateCart([{ price: -5 }]);
    expect(result.subtotal).toBe(-5);
  });

  test('NaN price → throws Error', () => {
    expect(() => calculateCart([{ price: NaN }])).toThrow('Invalid price');
  });

  test('rounding: $7.99 * 8% = 0.6392 → rounded to 0.64', () => {
    const result = calculateCart([{ price: 7.99 }]);
    expect(result.subtotal).toBe(7.99);
    expect(result.tax).toBe(0.64);
    expect(result.total).toBe(8.63);
  });

  test('TAX_RATE is 0.08', () => {
    expect(TAX_RATE).toBe(0.08);
  });
});

describe('validateCartTotal', () => {
  test('matching values → match: true', () => {
    const result = validateCartTotal(32.39, 'Total: $32.39');
    expect(result.match).toBe(true);
    expect(result.calculated).toBe(32.39);
    expect(result.fromSite).toBe(32.39);
  });

  test('mismatched total → match: false', () => {
    const result = validateCartTotal(32.39, 'Total: $99.99');
    expect(result.match).toBe(false);
  });

  test('within tolerance (±0.01) → match: true', () => {
    const result = validateCartTotal(32.39, 'Total: $32.40');
    expect(result.match).toBe(true);
  });

  test('parse dollar sign format', () => {
    const result = validateCartTotal(8.63, '$8.63');
    expect(result.match).toBe(true);
  });
});
