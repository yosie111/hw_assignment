// tests/domain/Cart.test.js

const { createCart } = require('../../src/domain/Cart');
const { createProduct } = require('../../src/domain/Product');

describe('Cart (Aggregate Root)', () => {
  const p1 = createProduct({ id: 'onesie', title: 'Sauce Labs Onesie', price: 7.99, source: 'Saucedemo' });
  const p2 = createProduct({ id: 'bike-light', title: 'Sauce Labs Bike Light', price: 9.99, source: 'Saucedemo' });
  const p3 = createProduct({ id: 'backpack', title: 'Sauce Labs Backpack', price: 29.99, source: 'Saucedemo' });

  test('new cart is empty', () => {
    const cart = createCart();
    expect(cart.isEmpty()).toBe(true);
    expect(cart.getCount()).toBe(0);
    expect(cart.getItems()).toHaveLength(0);
  });

  test('add items increments count', () => {
    const cart = createCart();
    cart.addItem(p1);
    expect(cart.getCount()).toBe(1);
    expect(cart.isEmpty()).toBe(false);

    cart.addItem(p2);
    expect(cart.getCount()).toBe(2);

    cart.addItem(p3);
    expect(cart.getCount()).toBe(3);
  });

  test('items are in correct order', () => {
    const cart = createCart();
    cart.addItem(p1);
    cart.addItem(p2);
    cart.addItem(p3);
    const items = cart.getItems();
    expect(items[0].id).toBe('onesie');
    expect(items[1].id).toBe('bike-light');
    expect(items[2].id).toBe('backpack');
  });

  test('duplicate item throws', () => {
    const cart = createCart();
    cart.addItem(p1);
    expect(() => cart.addItem(p1)).toThrow('already in cart');
    expect(cart.getCount()).toBe(1);
  });

  test('getItems returns copy (external mutation protection)', () => {
    const cart = createCart();
    cart.addItem(p1);
    const copy = cart.getItems();
    copy.push({ id: 'hack', title: 'Hack', price: 0 });
    expect(cart.getCount()).toBe(1);

    copy.length = 0;
    expect(cart.getCount()).toBe(1);
  });

  test('remove item', () => {
    const cart = createCart();
    cart.addItem(p1);
    cart.addItem(p2);
    cart.removeItem('onesie');
    expect(cart.getCount()).toBe(1);
    expect(cart.getItems()[0].id).toBe('bike-light');
  });

  test('remove non-existent item is no-op', () => {
    const cart = createCart();
    cart.addItem(p1);
    cart.removeItem('non-existent');
    expect(cart.getCount()).toBe(1);
  });

  test('clear empties the cart', () => {
    const cart = createCart();
    cart.addItem(p1);
    cart.addItem(p2);
    cart.clear();
    expect(cart.isEmpty()).toBe(true);
    expect(cart.getCount()).toBe(0);
  });

  test('can re-add after clear', () => {
    const cart = createCart();
    cart.addItem(p1);
    cart.clear();
    cart.addItem(p1);
    expect(cart.getCount()).toBe(1);
  });

  test('null product throws', () => {
    const cart = createCart();
    expect(() => cart.addItem(null)).toThrow('invalid product');
  });

  test('product without id throws', () => {
    const cart = createCart();
    expect(() => cart.addItem({ title: 'No ID', price: 5 })).toThrow('invalid product');
  });

  test('independent carts do not affect each other', () => {
    const cart1 = createCart();
    const cart2 = createCart();
    cart1.addItem(p1);
    cart2.addItem(p2);
    expect(cart1.getCount()).toBe(1);
    expect(cart2.getCount()).toBe(1);
  });
});
