// tests/domain/Order.test.js

const { createOrder } = require('../../src/domain/Order');

console.log('=== Order Model Tests ===\n');
let passed = 0, failed = 0;

function assert(label, condition) {
  if (condition) { console.log(`  ✅ ${label}`); passed++; }
  else { console.log(`  ❌ ${label}`); failed++; }
}

// ── Successful order ──
const order = createOrder({
  requestId: 'req-001',
  product: { id: 'onesie', title: 'Onesie', price: 7.99 },
  shipping: { firstName: 'Test', lastName: 'User', postalCode: '12345' },
  status: 'completed',
  confirmText: 'Thank you for your order!',
  totalText: 'Total: $8.63',
  screenshots: ['screenshots/proof.png'],
  steps: [{ step: 'Login', status: 'success', durationMs: 3200 }],
  cartValidation: { breakdown: { subtotal: 7.99, tax: 0.64, total: 8.63 }, fromSite: 8.63, match: true },
});
assert('Order: requestId = req-001', order.requestId === 'req-001');
assert('Order: status = completed', order.status === 'completed');
assert('Order: product.title = Onesie', order.product.title === 'Onesie');
assert('Order: shipping.firstName = Test', order.shipping.firstName === 'Test');
assert('Order: confirmText set', order.confirmText === 'Thank you for your order!');
assert('Order: totalText set', order.totalText === 'Total: $8.63');
assert('Order: screenshots length = 1', order.screenshots.length === 1);
assert('Order: steps length = 1', order.steps.length === 1);
assert('Order: cartValidation.match = true', order.cartValidation.match === true);
assert('Order: cartValidation.breakdown.tax = 0.64', order.cartValidation.breakdown.tax === 0.64);
assert('Order: createdAt exists', typeof order.createdAt === 'string');
assert('Order: error = null', order.error === null);

// ── Object.freeze — immutability ──
try { order.status = 'failed'; } catch (_) {}
assert('Frozen: status cannot be changed', order.status === 'completed');

try { order.screenshots.push('hack.png'); } catch (_) {}
assert('Frozen: screenshots array cannot be mutated', order.screenshots.length === 1);

try { order.steps.push({ step: 'Hack' }); } catch (_) {}
assert('Frozen: steps array cannot be mutated', order.steps.length === 1);

// ── Failed order ──
const failedOrder = createOrder({
  requestId: 'req-002',
  status: 'failed',
  error: 'Add to cart failed after 3 attempts',
});
assert('Failed order: status = failed', failedOrder.status === 'failed');
assert('Failed order: error set', failedOrder.error.includes('3 attempts'));
assert('Failed order: product = null', failedOrder.product === null);
assert('Failed order: shipping = null', failedOrder.shipping === null);
assert('Failed order: screenshots = []', failedOrder.screenshots.length === 0);
assert('Failed order: cartValidation = null', failedOrder.cartValidation === null);

// ── Defaults ──
const minimal = createOrder({ requestId: 'req-003', status: 'completed' });
assert('Default: confirmText = null', minimal.confirmText === null);
assert('Default: totalText = null', minimal.totalText === null);
assert('Default: screenshots = []', minimal.screenshots.length === 0);
assert('Default: steps = []', minimal.steps.length === 0);
assert('Default: error = null', minimal.error === null);

// ── Fail Fast — missing requestId ──
try {
  createOrder({ status: 'completed' });
  assert('Missing requestId throws', false);
} catch (e) {
  assert('Missing requestId throws', e.message.includes('requestId is required'));
}

// ── Fail Fast — missing status ──
try {
  createOrder({ requestId: 'req-004' });
  assert('Missing status throws', false);
} catch (e) {
  assert('Missing status throws', e.message.includes('status is required'));
}

// ── JSON serializable ──
const json = JSON.stringify(order);
const parsed = JSON.parse(json);
assert('JSON serializable: requestId', parsed.requestId === 'req-001');
assert('JSON serializable: cartValidation.match', parsed.cartValidation.match === true);

console.log(`\n  Results: ${passed} passed, ${failed} failed\n`);
if (failed > 0) process.exit(1);
