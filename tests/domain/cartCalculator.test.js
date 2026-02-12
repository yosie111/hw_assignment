// tests/domain/cartCalculator.test.js

const { calculateCart, validateCartTotal, TAX_RATE } = require('../../src/domain/cartCalculator');

console.log('=== Cart Calculator (Oracle) Tests ===\n');
let passed = 0, failed = 0;

function assert(label, condition) {
  if (condition) { console.log(`  ✅ ${label}`); passed++; }
  else { console.log(`  ❌ ${label}`); failed++; }
}

// ── Tax rate ──
assert('TAX_RATE exported = 0.08', TAX_RATE === 0.08);

// ── Single product: $7.99 (Sauce Labs Onesie) ──
const single = calculateCart([{ title: 'Onesie', price: 7.99 }]);
assert('Single: subtotal = 7.99', single.subtotal === 7.99);
assert('Single: tax = 0.64', single.tax === 0.64);
assert('Single: total = 8.63', single.total === 8.63);

// ── Multiple products: $7.99 + $9.99 = $17.98 ──
const multi = calculateCart([
  { title: 'Onesie', price: 7.99 },
  { title: 'Bike Light', price: 9.99 },
]);
assert('Multi: subtotal = 17.98', multi.subtotal === 17.98);
assert('Multi: tax = 1.44', multi.tax === 1.44);
assert('Multi: total = 19.42', multi.total === 19.42);

// ── Three products: $7.99 + $9.99 + $29.99 = $47.97 ──
const three = calculateCart([
  { title: 'Onesie', price: 7.99 },
  { title: 'Bike Light', price: 9.99 },
  { title: 'Backpack', price: 29.99 },
]);
assert('Three: subtotal = 47.97', three.subtotal === 47.97);
assert('Three: tax = 3.84', three.tax === 3.84);
assert('Three: total = 51.81', three.total === 51.81);

// ── Expensive product: $49.99 (Sauce Labs Fleece Jacket) ──
const expensive = calculateCart([{ title: 'Fleece Jacket', price: 49.99 }]);
assert('Expensive: subtotal = 49.99', expensive.subtotal === 49.99);
assert('Expensive: tax = 4.00', expensive.tax === 4.00);
assert('Expensive: total = 53.99', expensive.total === 53.99);

// ── Cheapest product: $7.99 ──
const cheapest = calculateCart([{ title: 'Onesie', price: 7.99 }]);
assert('Cheapest product total matches Saucedemo', cheapest.total === 8.63);

// ── Subtotal Tax strategy confirmation ──
// Subtotal Tax: round(17.98 * 0.08) = round(1.4384) = 1.44
// Line-Item:    round(7.99*0.08) + round(9.99*0.08) = 0.64 + 0.80 = 1.44
// Same result here, but strategy matters for other combinations
assert('Subtotal Tax strategy: multi.tax = 1.44', multi.tax === 1.44);

// ── IEEE 754 floating point fix: 0.1 + 0.2 ──
const tricky = calculateCart([
  { title: 'A', price: 0.1 },
  { title: 'B', price: 0.2 },
]);
assert('Floating point fix: subtotal = 0.3 (not 0.30000...04)', tricky.subtotal === 0.3);
assert('Floating point fix: tax = 0.02', tricky.tax === 0.02);
assert('Floating point fix: total = 0.32', tricky.total === 0.32);

// ── Another tricky float: $15.99 + $15.99 ──
const doubles = calculateCart([
  { title: 'A', price: 15.99 },
  { title: 'B', price: 15.99 },
]);
assert('Double $15.99: subtotal = 31.98', doubles.subtotal === 31.98);
assert('Double $15.99: tax = 2.56', doubles.tax === 2.56);
assert('Double $15.99: total = 34.54', doubles.total === 34.54);

// ── Empty list throws ──
try {
  calculateCart([]);
  assert('Empty list throws', false);
} catch (e) {
  assert('Empty list throws', e.message.includes('no products'));
}

// ── Null throws ──
try {
  calculateCart(null);
  assert('Null throws', false);
} catch (e) {
  assert('Null throws', e.message.includes('no products'));
}

// ── Invalid price throws ──
try {
  calculateCart([{ title: 'Bad', price: 'five' }]);
  assert('String price throws', false);
} catch (e) {
  assert('String price throws', e.message.includes('Invalid price'));
}

// ── NaN price throws ──
try {
  calculateCart([{ title: 'Bad', price: NaN }]);
  assert('NaN price throws', false);
} catch (e) {
  assert('NaN price throws', e.message.includes('Invalid price'));
}

// ════════════════════════════════════════
// Oracle Validation — validateCartTotal
// ════════════════════════════════════════

console.log('\n--- Oracle Validation (validateCartTotal) ---\n');

// ── Exact match ──
const v1 = validateCartTotal(8.63, 'Total: $8.63');
assert('Exact match: $8.63 === "Total: $8.63"', v1.match === true);
assert('Exact: calculated = 8.63', v1.calculated === 8.63);
assert('Exact: fromSite = 8.63', v1.fromSite === 8.63);

// ── Epsilon tolerance — 1 cent difference (Banker's Rounding) ──
const v2 = validateCartTotal(8.63, 'Total: $8.64');
assert('Epsilon: $8.63 ≈ $8.64 (diff=0.01 < 0.02) → match', v2.match === true);

// ── Epsilon tolerance — other direction ──
const v3 = validateCartTotal(8.64, 'Total: $8.63');
assert('Epsilon: $8.64 ≈ $8.63 (diff=0.01 < 0.02) → match', v3.match === true);

// ── Boundary: ~0.02 diff (floating point: 8.65-8.63 = 0.01999...) → still match ──
const v4a = validateCartTotal(8.63, 'Total: $8.65');
assert('Boundary: $8.63 vs $8.65 (diff≈0.02, FP rounds down) → match', v4a.match === true);

// ── Beyond tolerance: 0.03 diff → NO match ──
const v4b = validateCartTotal(8.63, 'Total: $8.66');
assert('Beyond tolerance: $8.63 vs $8.66 (diff=0.03) → no match', v4b.match === false);

// ── Real mismatch — bug in site ──
const v5 = validateCartTotal(8.63, 'Total: $10.00');
assert('Mismatch: $8.63 ≠ $10.00 → no match', v5.match === false);

// ── Large mismatch — tax not calculated ──
const v6 = validateCartTotal(53.99, 'Total: $49.99');
assert('Large mismatch: tax missing → no match', v6.match === false);

// ── Parse various DOM formats ──
const v7 = validateCartTotal(8.63, '$8.63');
assert('Parse "$8.63" → match', v7.match === true);

const v8 = validateCartTotal(8.63, '8.63');
assert('Parse "8.63" → match', v8.match === true);

const v9 = validateCartTotal(51.81, 'Total: $51.81');
assert('Parse "Total: $51.81" → match', v9.match === true);

console.log(`\n  Results: ${passed} passed, ${failed} failed\n`);
if (failed > 0) process.exit(1);
