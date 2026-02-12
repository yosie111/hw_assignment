// tests/unit/cartCalculator.test.js

const { calculateCart, verifyCart, roundTo2 } = require('../../src/domain/CartCalculator');

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

  test('empty array → subtotal: 0, tax: 0, total: 0', () => {
    const result = calculateCart([]);
    expect(result.subtotal).toBe(0);
    expect(result.tax).toBe(0);
    expect(result.total).toBe(0);
  });

  test('negative price → throws Error', () => {
    expect(() => calculateCart([{ price: -5 }])).toThrow('Invalid item price');
  });

  test('rounding: $7.99 * 8% = 0.6392 → rounded to 0.64', () => {
    const result = calculateCart([{ price: 7.99 }]);
    expect(result.subtotal).toBe(7.99);
    expect(result.tax).toBe(0.64);
    expect(result.total).toBe(8.63);
  });
});

describe('verifyCart', () => {
  test('matching values → match: true', () => {
    const calculated = { subtotal: 29.99, tax: 2.40, total: 32.39 };
    const domValues = { subtotal: 29.99, tax: 2.40, total: 32.39 };
    const result = verifyCart(domValues, calculated);
    expect(result.match).toBe(true);
  });

  test('mismatched total → match: false', () => {
    const calculated = { subtotal: 29.99, tax: 2.40, total: 32.39 };
    const domValues = { subtotal: 29.99, tax: 2.40, total: 99.99 };
    const result = verifyCart(domValues, calculated);
    expect(result.match).toBe(false);
    expect(result.details.totalMatch).toBe(false);
  });

  test('within tolerance (±0.01) → match: true', () => {
    const calculated = { subtotal: 29.99, tax: 2.40, total: 32.39 };
    const domValues = { subtotal: 29.99, tax: 2.40, total: 32.40 };
    const result = verifyCart(domValues, calculated);
    expect(result.match).toBe(true);
  });
});

describe('roundTo2', () => {
  test('rounds correctly', () => {
    expect(roundTo2(0.6392)).toBe(0.64);
    expect(roundTo2(3.456)).toBe(3.46);
    expect(roundTo2(0)).toBe(0);
    expect(roundTo2(10.1)).toBe(10.1);
  });
});
