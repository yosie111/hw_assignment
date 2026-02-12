// tests/domain/Product.test.js

const { createProduct } = require('../../src/domain/Product');

console.log('=== Product Model Tests ===\n');
let passed = 0, failed = 0;

function assert(label, condition) {
  if (condition) { console.log(`  ✅ ${label}`); passed++; }
  else { console.log(`  ❌ ${label}`); failed++; }
}

// ── Valid product — frozen POJO ──
const p = createProduct({
  id: 'sauce-labs-backpack',
  title: '  Sauce Labs Backpack  ',
  price: 29.99,
  currency: 'USD',
  productUrl: 'https://www.saucedemo.com/inventory-item.html?id=4',
  imageUrl: '/img/backpack.jpg',
  source: 'Saucedemo',
});
assert('Valid product: correct id', p.id === 'sauce-labs-backpack');
assert('Valid product: correct price', p.price === 29.99);
assert('Valid product: title trimmed', p.title === 'Sauce Labs Backpack');
assert('Valid product: source set', p.source === 'Saucedemo');
assert('Valid product: productUrl set', p.productUrl === 'https://www.saucedemo.com/inventory-item.html?id=4');
assert('Valid product: imageUrl set', p.imageUrl === '/img/backpack.jpg');
assert('Valid product: currency set', p.currency === 'USD');

// ── Object.freeze — immutability test ──
try { p.price = 0; } catch (_) {}
assert('Frozen: price cannot be changed', p.price === 29.99);

try { p.title = 'HACKED'; } catch (_) {}
assert('Frozen: title cannot be changed', p.title === 'Sauce Labs Backpack');

// ── Defaults ──
const pDef = createProduct({ id: 'x', title: 'X', price: 10 });
assert('Default currency = USD', pDef.currency === 'USD');
assert('Default imageUrl = null', pDef.imageUrl === null);
assert('Default source = unknown', pDef.source === 'unknown');
assert('Default productUrl = empty string', pDef.productUrl === '');

// ── Fail Fast — missing id ──
try {
  createProduct({ title: 'No ID', price: 10 });
  assert('Missing id throws', false);
} catch (e) {
  assert('Missing id throws', e.message.includes('id is required'));
}

// ── Fail Fast — empty string id ──
try {
  createProduct({ id: '', title: 'Empty ID', price: 10 });
  assert('Empty id throws', false);
} catch (e) {
  assert('Empty id throws', e.message.includes('id is required'));
}

// ── Fail Fast — missing title ──
try {
  createProduct({ id: 'x', price: 10 });
  assert('Missing title throws', false);
} catch (e) {
  assert('Missing title throws', e.message.includes('title is required'));
}

// ── Fail Fast — negative price (anomaly in e-commerce) ──
try {
  createProduct({ id: 'x', title: 'X', price: -5 });
  assert('Negative price throws', false);
} catch (e) {
  assert('Negative price throws', e.message.includes('non-negative'));
}

// ── Fail Fast — NaN price (parser failure passthrough) ──
try {
  createProduct({ id: 'x', title: 'X', price: NaN });
  assert('NaN price throws', false);
} catch (e) {
  assert('NaN price throws', e.message.includes('non-negative'));
}

// ── Fail Fast — string price (parser forgot to convert) ──
try {
  createProduct({ id: 'x', title: 'X', price: '$29.99' });
  assert('String price throws', false);
} catch (e) {
  assert('String price throws', e.message.includes('non-negative'));
}

// ── Zero price is valid (free items) ──
const free = createProduct({ id: 'free-item', title: 'Free', price: 0 });
assert('Zero price is valid', free.price === 0);

// ── JSON serializable (no methods, no circular refs) ──
const json = JSON.stringify(p);
const parsed = JSON.parse(json);
assert('JSON serializable: id', parsed.id === p.id);
assert('JSON serializable: price', parsed.price === p.price);
assert('JSON serializable: title', parsed.title === p.title);
assert('JSON: no extra keys', Object.keys(parsed).length === 7);

console.log(`\n  Results: ${passed} passed, ${failed} failed\n`);
if (failed > 0) process.exit(1);
