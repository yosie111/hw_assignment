// tests/unit/utils.test.js

const { normalizePrice } = require('../../src/automation/utils/normalizePrice');
const { withRetry } = require('../../src/automation/utils/retry');
const { validateSearchInput, validatePurchaseInput } = require('../../src/automation/utils/inputValidator');
const { createStepLogger } = require('../../src/automation/utils/stepLogger');

// ─── normalizePrice ─────────────────────────────────────────

describe('normalizePrice', () => {
  test('"$29.99" → { price: 29.99, currency: "USD" }', () => {
    const result = normalizePrice('$29.99');
    expect(result.price).toBe(29.99);
    expect(result.currency).toBe('USD');
  });

  test('"€15.50" → { price: 15.50, currency: "EUR" }', () => {
    const result = normalizePrice('€15.50');
    expect(result.price).toBe(15.50);
    expect(result.currency).toBe('EUR');
  });

  test('"abc" → throws Error', () => {
    expect(() => normalizePrice('abc')).toThrow('Cannot parse price');
  });

  test('null → throws Error', () => {
    expect(() => normalizePrice(null)).toThrow('Invalid price string');
  });
});

// ─── retry ──────────────────────────────────────────────────

describe('withRetry', () => {
  test('succeeds on first attempt — returns result', async () => {
    const fn = jest.fn().mockResolvedValue('ok');
    const result = await withRetry(fn, { label: 'test' });
    expect(result).toBe('ok');
    expect(fn).toHaveBeenCalledTimes(1);
  });

  test('fails twice, succeeds on third — returns result', async () => {
    const fn = jest.fn()
      .mockRejectedValueOnce(new Error('fail1'))
      .mockRejectedValueOnce(new Error('fail2'))
      .mockResolvedValue('ok');
    const result = await withRetry(fn, { label: 'test', maxAttempts: 3 });
    expect(result).toBe('ok');
    expect(fn).toHaveBeenCalledTimes(3);
  });

  test('fails 3 times — throws with "[label] Failed after 3 attempts"', async () => {
    const fn = jest.fn().mockRejectedValue(new Error('boom'));
    await expect(
      withRetry(fn, { label: 'AddToCart', maxAttempts: 3 })
    ).rejects.toThrow('[AddToCart] Failed after 3 attempts: boom');
    expect(fn).toHaveBeenCalledTimes(3);
  });
});

// ─── inputValidator ─────────────────────────────────────────

describe('validateSearchInput', () => {
  test('{ query: "" } — passes', () => {
    expect(() => validateSearchInput({ query: '' })).not.toThrow();
  });

  test('{ filters: { maxPrice: -5 } } — throws', () => {
    expect(() => validateSearchInput({ filters: { maxPrice: -5 } })).toThrow('maxPrice');
  });
});

describe('validatePurchaseInput', () => {
  const validShipping = { firstName: 'Test', lastName: 'User', postalCode: '12345' };

  test('{ productTitle: "", shipping } — throws', () => {
    expect(() => validatePurchaseInput({ productTitle: '', shipping: validShipping })).toThrow('productTitle');
  });

  test('shipping.firstName missing — throws', () => {
    expect(() => validatePurchaseInput({
      productTitle: 'Item',
      shipping: { ...validShipping, firstName: '' },
    })).toThrow('shipping.firstName');
  });
});

// ─── stepLogger ─────────────────────────────────────────────

describe('createStepLogger', () => {
  // Suppress console.log/error during tests
  beforeEach(() => {
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });
  afterEach(() => jest.restoreAllMocks());

  test('runStep returns result of fn', async () => {
    const logger = createStepLogger('req-1');
    const result = await logger.runStep('TestStep', async () => 42);
    expect(result).toBe(42);
  });

  test('runStep calls onStep with status: running then success', async () => {
    const events = [];
    const logger = createStepLogger('req-1', (e) => events.push(e));

    await logger.runStep('Login', async () => 'done');

    expect(events.length).toBe(2);
    expect(events[0].status).toBe('running');
    expect(events[0].step).toBe('Login');
    expect(events[0].requestId).toBe('req-1');
    expect(events[1].status).toBe('success');
    expect(events[1].durationMs).toBeGreaterThanOrEqual(0);
  });

  test('runStep on failure — onStep with status: failed + error message', async () => {
    const events = [];
    const logger = createStepLogger('req-1', (e) => events.push(e));

    await expect(
      logger.runStep('BadStep', async () => { throw new Error('oops'); })
    ).rejects.toThrow('oops');

    expect(events.length).toBe(2);
    expect(events[1].status).toBe('failed');
    expect(events[1].error).toBe('oops');
  });

  test('getSteps() returns full history', async () => {
    const logger = createStepLogger('req-1');

    await logger.runStep('Step1', async () => 'a');
    await logger.runStep('Step2', async () => 'b');

    const steps = logger.getSteps();
    expect(steps.length).toBe(2);
    expect(steps[0].step).toBe('Step1');
    expect(steps[1].step).toBe('Step2');
  });
});
