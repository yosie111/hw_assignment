// tests/domain/cartCalculator.test.js

const { calculateCart, validateCartTotal, parsePrice, DEFAULT_TAX_RATE } = require('../../src/domain/CartCalculator');

describe('CartCalculator (Oracle)', () => {
  test('DEFAULT_TAX_RATE exported = 0', () => {
    expect(DEFAULT_TAX_RATE).toBe(0);
  });

  // ── Single product: $7.99 (Sauce Labs Onesie) — tax 0% ──
  test('single product $7.99 with 0% tax', () => {
    const single = calculateCart([{ title: 'Onesie', price: 7.99 }]);
    expect(single.subtotal).toBe(7.99);
    expect(single.tax).toBe(0);
    expect(single.total).toBe(7.99);
  });

  // ── Multiple products: $7.99 + $9.99 = $17.98 ──
  test('multiple products $7.99 + $9.99', () => {
    const multi = calculateCart([
      { title: 'Onesie', price: 7.99 },
      { title: 'Bike Light', price: 9.99 },
    ]);
    expect(multi.subtotal).toBe(17.98);
    expect(multi.tax).toBe(0);
    expect(multi.total).toBe(17.98);
  });

  // ── Three products: $7.99 + $9.99 + $29.99 = $47.97 ──
  test('three products $7.99 + $9.99 + $29.99', () => {
    const three = calculateCart([
      { title: 'Onesie', price: 7.99 },
      { title: 'Bike Light', price: 9.99 },
      { title: 'Backpack', price: 29.99 },
    ]);
    expect(three.subtotal).toBe(47.97);
    expect(three.tax).toBe(0);
    expect(three.total).toBe(47.97);
  });

  // ── Expensive product: $49.99 (Sauce Labs Fleece Jacket) ──
  test('expensive product $49.99', () => {
    const expensive = calculateCart([{ title: 'Fleece Jacket', price: 49.99 }]);
    expect(expensive.subtotal).toBe(49.99);
    expect(expensive.tax).toBe(0);
    expect(expensive.total).toBe(49.99);
  });

  // ── Custom tax rate 8% ──
  test('custom tax rate 8%: $7.99 → tax 0.64, total 8.63', () => {
    const result = calculateCart([{ title: 'Onesie', price: 7.99 }], { taxRate: 0.08 });
    expect(result.subtotal).toBe(7.99);
    expect(result.tax).toBe(0.64);
    expect(result.total).toBe(8.63);
  });

  // ── IEEE 754 floating point fix: 0.1 + 0.2 ──
  test('IEEE 754 floating point fix: 0.1 + 0.2 = 0.3', () => {
    const tricky = calculateCart([
      { title: 'A', price: 0.1 },
      { title: 'B', price: 0.2 },
    ]);
    expect(tricky.subtotal).toBe(0.3);
    expect(tricky.tax).toBe(0);
    expect(tricky.total).toBe(0.3);
  });

  // ── Another tricky float: $15.99 + $15.99 ──
  test('double $15.99 = $31.98', () => {
    const doubles = calculateCart([
      { title: 'A', price: 15.99 },
      { title: 'B', price: 15.99 },
    ]);
    expect(doubles.subtotal).toBe(31.98);
    expect(doubles.tax).toBe(0);
    expect(doubles.total).toBe(31.98);
  });

  // ── Error cases ──
  test('empty array throws', () => {
    expect(() => calculateCart([])).toThrow();
  });

  test('null throws', () => {
    expect(() => calculateCart(null)).toThrow();
  });
});

describe('validateCartTotal (Oracle Validation)', () => {
  test('exact match: $8.63 === "Total: $8.63"', () => {
    const v = validateCartTotal(8.63, 'Total: $8.63');
    expect(v.match).toBe(true);
    expect(v.calculated).toBe(8.63);
    expect(v.fromSite).toBe(8.63);
  });

  test('epsilon tolerance: $8.63 ≈ $8.64 (diff=0.01) → match', () => {
    expect(validateCartTotal(8.63, 'Total: $8.64').match).toBe(true);
  });

  test('epsilon tolerance: $8.64 ≈ $8.63 → match', () => {
    expect(validateCartTotal(8.64, 'Total: $8.63').match).toBe(true);
  });

  test('boundary: $8.63 vs $8.65 (diff≈0.02) → match', () => {
    expect(validateCartTotal(8.63, 'Total: $8.65').match).toBe(true);
  });

  test('beyond tolerance: $8.63 vs $8.66 (diff=0.03) → no match', () => {
    expect(validateCartTotal(8.63, 'Total: $8.66').match).toBe(false);
  });

  test('real mismatch: $8.63 ≠ $10.00 → no match', () => {
    expect(validateCartTotal(8.63, 'Total: $10.00').match).toBe(false);
  });

  test('parse "$8.63" → match', () => {
    expect(validateCartTotal(8.63, '$8.63').match).toBe(true);
  });

  test('parse "8.63" → match', () => {
    expect(validateCartTotal(8.63, '8.63').match).toBe(true);
  });

  test('parse "Total: $51.81" → match', () => {
    expect(validateCartTotal(51.81, 'Total: $51.81').match).toBe(true);
  });
});

describe('parsePrice (DOM text → number)', () => {
  test('parses "Item total: $7.99" → 7.99', () => {
    expect(parsePrice('Item total: $7.99')).toBe(7.99);
  });

  test('parses "Tax: $0.64" → 0.64', () => {
    expect(parsePrice('Tax: $0.64')).toBe(0.64);
  });

  test('parses "Total: $8.63" → 8.63', () => {
    expect(parsePrice('Total: $8.63')).toBe(8.63);
  });

  test('parses "$8.63" → 8.63', () => {
    expect(parsePrice('$8.63')).toBe(8.63);
  });

  test('parses "8.63" → 8.63', () => {
    expect(parsePrice('8.63')).toBe(8.63);
  });

  test('returns NaN for null/undefined/empty', () => {
    expect(isNaN(parsePrice(null))).toBe(true);
    expect(isNaN(parsePrice(undefined))).toBe(true);
    expect(isNaN(parsePrice(''))).toBe(true);
  });

  test('parses "Tax: $0.00" → 0', () => {
    expect(parsePrice('Tax: $0.00')).toBe(0);
  });
});
