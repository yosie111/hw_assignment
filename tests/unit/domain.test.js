// tests/unit/domain.test.js

const { createProduct } = require('../../src/domain/Product');
const { createCart } = require('../../src/domain/Cart');
const { OrderResult } = require('../../src/domain/OrderResult');

// ─── Product ────────────────────────────────────────────────

describe('Product', () => {
  const validProduct = {
    id: 'sauce-labs-backpack',
    title: 'Sauce Labs Backpack',
    price: 29.99,
    currency: 'USD',
    productUrl: 'https://www.saucedemo.com/inventory-item.html?id=4',
    imageUrl: '/static/media/sauce-backpack.png',
    source: 'saucedemo.com',
  };

  test('createProduct() returns object with all fields', () => {
    const p = createProduct(validProduct);
    expect(p.id).toBe('sauce-labs-backpack');
    expect(p.title).toBe('Sauce Labs Backpack');
    expect(p.price).toBe(29.99);
    expect(p.currency).toBe('USD');
    expect(p.productUrl).toBe('https://www.saucedemo.com/inventory-item.html?id=4');
    expect(p.imageUrl).toBe('/static/media/sauce-backpack.png');
    expect(p.source).toBe('saucedemo.com');
  });

  test('createProduct() throws when title is missing', () => {
    expect(() => createProduct({ ...validProduct, title: '' })).toThrow('title');
  });

  test('★ G1: id must be a non-empty string', () => {
    expect(() => createProduct({ ...validProduct, id: '' })).toThrow('id');
    expect(() => createProduct({ ...validProduct, id: null })).toThrow('id');
    // Valid id should pass
    expect(() => createProduct({ ...validProduct, id: 'sauce-labs-backpack' })).not.toThrow();
  });

  test('★ G2: price must be a non-negative number', () => {
    expect(() => createProduct({ ...validProduct, price: -1 })).toThrow('price');
    expect(() => createProduct({ ...validProduct, price: NaN })).toThrow('price');
    expect(() => createProduct({ ...validProduct, price: 'abc' })).toThrow('price');
  });

  test('★ G3: source defaults to "unknown" when not provided', () => {
    const p = createProduct({ ...validProduct, source: undefined });
    expect(p.source).toBe('unknown');
  });
});

// ─── Cart ───────────────────────────────────────────────────

describe('Cart', () => {
  test('addItem + getItems works correctly', () => {
    const cart = createCart();
    cart.addItem({ id: 'a', title: 'Item A', price: 10.50 });
    cart.addItem({ id: 'b', title: 'Item B', price: 5.25 });
    expect(cart.getItems()).toHaveLength(2);
    expect(cart.getCount()).toBe(2);
  });

  test('isEmpty returns true when empty', () => {
    const cart = createCart();
    expect(cart.isEmpty()).toBe(true);
    expect(cart.getCount()).toBe(0);
  });
});

// ─── OrderResult ────────────────────────────────────────────

describe('OrderResult', () => {
  test('status must be "completed" or "failed"', () => {
    expect(() => OrderResult.create({ status: 'completed', requestId: 'r1' })).not.toThrow();
    expect(() => OrderResult.create({ status: 'failed', requestId: 'r1' })).not.toThrow();
    expect(() => OrderResult.create({ status: 'pending', requestId: 'r1' })).toThrow('status');
    expect(() => OrderResult.create({ status: '', requestId: 'r1' })).toThrow('status');
  });

  test('isSuccess reflects status', () => {
    const ok = OrderResult.create({ status: 'completed', requestId: 'r1' });
    const fail = OrderResult.create({ status: 'failed', requestId: 'r2' });
    expect(ok.isSuccess).toBe(true);
    expect(fail.isSuccess).toBe(false);
  });

  test('result is frozen (immutable)', () => {
    const result = OrderResult.create({ status: 'completed', requestId: 'r1' });
    result.status = 'failed'; // silently ignored in non-strict mode
    expect(result.status).toBe('completed'); // value unchanged
    expect(Object.isFrozen(result)).toBe(true);
  });
});
