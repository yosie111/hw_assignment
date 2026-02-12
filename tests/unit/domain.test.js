// tests/unit/domain.test.js

const { Product } = require('../../src/domain/Product');
const { Cart } = require('../../src/domain/Cart');
const { OrderResult } = require('../../src/domain/OrderResult');

// ─── Product ────────────────────────────────────────────────

describe('Product', () => {
  const validProduct = {
    id: 'sauce-labs-backpack',
    title: 'Sauce Labs Backpack',
    price: 29.99,
    currency: 'USD',
    url: 'https://www.saucedemo.com/inventory-item.html?id=4',
    imageUrl: '/static/media/sauce-backpack.png',
    source: 'saucedemo.com',
  };

  test('create() returns object with all fields', () => {
    const p = Product.create(validProduct);
    expect(p.id).toBe('sauce-labs-backpack');
    expect(p.title).toBe('Sauce Labs Backpack');
    expect(p.price).toBe(29.99);
    expect(p.currency).toBe('USD');
    expect(p.url).toBe('https://www.saucedemo.com/inventory-item.html?id=4');
    expect(p.imageUrl).toBe('/static/media/sauce-backpack.png');
    expect(p.source).toBe('saucedemo.com');
  });

  test('create() throws when title is missing', () => {
    expect(() => Product.create({ ...validProduct, title: '' })).toThrow('title');
  });

  test('★ G1: id must be a slug, not a numeric index', () => {
    expect(() => Product.create({ ...validProduct, id: '0' })).toThrow('slug');
    expect(() => Product.create({ ...validProduct, id: '42' })).toThrow('slug');
    // Valid slugs should pass
    expect(() => Product.create({ ...validProduct, id: 'sauce-labs-backpack' })).not.toThrow();
  });

  test('★ G2: url must start with http', () => {
    expect(() => Product.create({ ...validProduct, url: '/inventory-item.html?id=4' })).toThrow('url');
    expect(() => Product.create({ ...validProduct, url: '' })).toThrow('url');
  });

  test('★ G3: source must be defined', () => {
    expect(() => Product.create({ ...validProduct, source: '' })).toThrow('source');
    expect(() => Product.create({ ...validProduct, source: undefined })).toThrow('source');
  });
});

// ─── Cart ───────────────────────────────────────────────────

describe('Cart', () => {
  test('addItem + getTotal calculates correctly', () => {
    const cart = new Cart();
    cart.addItem({ id: 'a', title: 'Item A', price: 10.50 });
    cart.addItem({ id: 'b', title: 'Item B', price: 5.25 });
    expect(cart.getTotal()).toBeCloseTo(15.75, 2);
    expect(cart.count).toBe(2);
  });

  test('getTotal returns 0 when empty', () => {
    const cart = new Cart();
    expect(cart.getTotal()).toBe(0);
    expect(cart.count).toBe(0);
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
});
