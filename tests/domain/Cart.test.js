// tests/domain/Cart.test.js

const { createCart } = require('../../src/domain/Cart');
const { createProduct } = require('../../src/domain/Product');

console.log('=== Cart (Aggregate Root) Tests ===\n');
let passed = 0, failed = 0;

function assert(label, condition) {
  if (condition) { console.log(`  ✅ ${label}`); passed++; }
  else { console.log(`  ❌ ${label}`); failed++; }
}

const p1 = createProduct({ id: 'onesie', title: 'Sauce Labs Onesie', price: 7.99, source: 'Saucedemo' });
const p2 = createProduct({ id: 'bike-light', title: 'Sauce Labs Bike Light', price: 9.99, source: 'Saucedemo' });
const p3 = createProduct({ id: 'backpack', title: 'Sauce Labs Backpack', price: 29.99, source: 'Saucedemo' });

// ── New cart is empty ──
const cart = createCart();
assert('New cart is empty', cart.isEmpty());
assert('New cart count = 0', cart.getCount() === 0);
assert('New cart items = []', cart.getItems().length === 0);

// ── Add items ──
cart.addItem(p1);
assert('After add p1: count = 1', cart.getCount() === 1);
assert('After add p1: not empty', !cart.isEmpty());

cart.addItem(p2);
assert('After add p2: count = 2', cart.getCount() === 2);

cart.addItem(p3);
assert('After add p3: count = 3', cart.getCount() === 3);

// ── Items are correct ──
const items = cart.getItems();
assert('First item is onesie', items[0].id === 'onesie');
assert('Second item is bike-light', items[1].id === 'bike-light');
assert('Third item is backpack', items[2].id === 'backpack');

// ── Aggregate Root — duplicate guard ──
try {
  cart.addItem(p1);
  assert('Duplicate p1 throws', false);
} catch (e) {
  assert('Duplicate p1 throws', e.message.includes('already in cart'));
}
assert('Count still 3 after duplicate attempt', cart.getCount() === 3);

// ── getItems returns copy (external mutation protection) ──
const copy = cart.getItems();
copy.push({ id: 'hack', title: 'Hack', price: 0 });
assert('getItems returns copy (push does not affect cart)', cart.getCount() === 3);

copy.length = 0;
assert('getItems returns copy (clearing array does not affect cart)', cart.getCount() === 3);

// ── Remove item ──
cart.removeItem('onesie');
assert('After remove onesie: count = 2', cart.getCount() === 2);
assert('First item is now bike-light', cart.getItems()[0].id === 'bike-light');

// ── Remove non-existent item (no error, just no-op) ──
cart.removeItem('non-existent');
assert('Remove non-existent: count still 2', cart.getCount() === 2);

// ── Clear ──
cart.clear();
assert('After clear: empty', cart.isEmpty());
assert('After clear: count = 0', cart.getCount() === 0);

// ── Can re-add after clear ──
cart.addItem(p1);
assert('Re-add after clear: count = 1', cart.getCount() === 1);

// ── Invalid product — null ──
try {
  cart.addItem(null);
  assert('Null product throws', false);
} catch (e) {
  assert('Null product throws', e.message.includes('invalid product'));
}

// ── Invalid product — no id ──
try {
  cart.addItem({ title: 'No ID', price: 5 });
  assert('Product without id throws', false);
} catch (e) {
  assert('Product without id throws', e.message.includes('invalid product'));
}

// ── Independent carts ──
const cart2 = createCart();
cart2.addItem(p2);
assert('Cart2 is independent: count = 1', cart2.getCount() === 1);
assert('Cart1 unchanged: count = 1', cart.getCount() === 1);

console.log(`\n  Results: ${passed} passed, ${failed} failed\n`);
if (failed > 0) process.exit(1);
