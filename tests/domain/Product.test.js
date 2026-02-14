// tests/domain/Product.test.js

const { createProduct } = require('../../src/domain/Product');

describe('Product Model', () => {
  test('valid product has correct fields', () => {
    const p = createProduct({
      id: 'sauce-labs-backpack',
      title: '  Sauce Labs Backpack  ',
      price: 29.99,
      currency: 'USD',
      productUrl: 'https://www.saucedemo.com/inventory-item.html?id=4',
      imageUrl: '/img/backpack.jpg',
      source: 'Saucedemo',
    });
    expect(p.id).toBe('sauce-labs-backpack');
    expect(p.price).toBe(29.99);
    expect(p.title).toBe('Sauce Labs Backpack');
    expect(p.source).toBe('Saucedemo');
    expect(p.productUrl).toBe('https://www.saucedemo.com/inventory-item.html?id=4');
    expect(p.imageUrl).toBe('/img/backpack.jpg');
    expect(p.currency).toBe('USD');
  });

  test('product is frozen (immutable)', () => {
    const p = createProduct({ id: 'x', title: 'X', price: 29.99 });
    try { p.price = 0; } catch (_) {}
    expect(p.price).toBe(29.99);

    try { p.title = 'HACKED'; } catch (_) {}
    expect(p.title).toBe('X');
  });

  test('defaults are correct', () => {
    const p = createProduct({ id: 'x', title: 'X', price: 10 });
    expect(p.currency).toBe('USD');
    expect(p.imageUrl).toBeNull();
    expect(p.source).toBe('unknown');
    expect(p.productUrl).toBe('');
  });

  test('missing id throws', () => {
    expect(() => createProduct({ title: 'No ID', price: 10 })).toThrow('id is required');
  });

  test('empty id throws', () => {
    expect(() => createProduct({ id: '', title: 'Empty ID', price: 10 })).toThrow('id is required');
  });

  test('missing title throws', () => {
    expect(() => createProduct({ id: 'x', price: 10 })).toThrow('title is required');
  });

  test('negative price throws', () => {
    expect(() => createProduct({ id: 'x', title: 'X', price: -5 })).toThrow('non-negative');
  });

  test('NaN price throws', () => {
    expect(() => createProduct({ id: 'x', title: 'X', price: NaN })).toThrow('non-negative');
  });

  test('string price throws', () => {
    expect(() => createProduct({ id: 'x', title: 'X', price: '$29.99' })).toThrow('non-negative');
  });

  test('zero price is valid (free items)', () => {
    const free = createProduct({ id: 'free-item', title: 'Free', price: 0 });
    expect(free.price).toBe(0);
  });

  test('JSON serializable', () => {
    const p = createProduct({ id: 'x', title: 'X', price: 10 });
    const parsed = JSON.parse(JSON.stringify(p));
    expect(parsed.id).toBe(p.id);
    expect(parsed.price).toBe(p.price);
    expect(parsed.title).toBe(p.title);
    expect(Object.keys(parsed)).toHaveLength(7);
  });
});
