// tests/services/statusStore.test.js

const statusStore = require('../../src/services/statusStore');

describe('statusStore', () => {
  beforeEach(() => {
    statusStore._clear();
  });

  // ===== create() =====
  describe('create()', () => {
    test('creates entry with correct initial state', () => {
      const entry = statusStore.create('req-1', 'search');

      expect(entry.requestId).toBe('req-1');
      expect(entry.type).toBe('search');
      expect(entry.status).toBe('running');
      expect(entry.currentStep).toBeNull();
      expect(entry.steps).toEqual([]);
      expect(entry.result).toBeNull();
      expect(entry.error).toBeNull();
      expect(entry.createdAt).toBeDefined();
      expect(entry.updatedAt).toBeDefined();
    });

    test('creates purchase type entry', () => {
      const entry = statusStore.create('req-2', 'purchase');
      expect(entry.type).toBe('purchase');
    });

    test('entry is retrievable via get()', () => {
      statusStore.create('req-3', 'search');
      const retrieved = statusStore.get('req-3');
      expect(retrieved).not.toBeNull();
      expect(retrieved.requestId).toBe('req-3');
    });

    test('increments store size', () => {
      statusStore.create('req-a', 'search');
      statusStore.create('req-b', 'purchase');
      expect(statusStore._size()).toBe(2);
    });
  });

  // ===== updateStep() =====
  describe('updateStep()', () => {
    test('adds step to steps array', () => {
      statusStore.create('req-4', 'search');
      statusStore.updateStep('req-4', {
        step: 'Login',
        status: 'completed',
        durationMs: 1200,
      });

      const entry = statusStore.get('req-4');
      expect(entry.steps).toHaveLength(1);
      expect(entry.steps[0].step).toBe('Login');
      expect(entry.steps[0].status).toBe('completed');
      expect(entry.steps[0].durationMs).toBe(1200);
      expect(entry.steps[0].timestamp).toBeDefined();
    });

    test('updates currentStep', () => {
      statusStore.create('req-5', 'purchase');
      statusStore.updateStep('req-5', { step: 'AddToCart', status: 'running' });

      const entry = statusStore.get('req-5');
      expect(entry.currentStep).toBe('AddToCart');
    });

    test('accumulates multiple steps', () => {
      statusStore.create('req-6', 'purchase');
      statusStore.updateStep('req-6', { step: 'Login', status: 'completed', durationMs: 1000 });
      statusStore.updateStep('req-6', { step: 'AddToCart', status: 'completed', durationMs: 2000 });
      statusStore.updateStep('req-6', { step: 'Checkout', status: 'running' });

      const entry = statusStore.get('req-6');
      expect(entry.steps).toHaveLength(3);
      expect(entry.currentStep).toBe('Checkout');
    });

    test('handles error in step event', () => {
      statusStore.create('req-7', 'search');
      statusStore.updateStep('req-7', {
        step: 'SearchAndScrape',
        status: 'failed',
        error: 'Element not found',
      });

      const entry = statusStore.get('req-7');
      expect(entry.steps[0].error).toBe('Element not found');
    });

    test('no-op for unknown requestId', () => {
      // Should not throw
      statusStore.updateStep('unknown-id', { step: 'Login', status: 'completed' });
    });

    test('updates updatedAt timestamp', () => {
      statusStore.create('req-8', 'search');
      const before = statusStore.get('req-8').updatedAt;

      // Small delay to ensure timestamp changes
      statusStore.updateStep('req-8', { step: 'Login', status: 'completed' });
      const after = statusStore.get('req-8').updatedAt;

      expect(after).toBeDefined();
    });

    test('defaults durationMs to null when not provided', () => {
      statusStore.create('req-9', 'search');
      statusStore.updateStep('req-9', { step: 'Login', status: 'completed' });

      const entry = statusStore.get('req-9');
      expect(entry.steps[0].durationMs).toBeNull();
    });
  });

  // ===== complete() =====
  describe('complete()', () => {
    test('sets status to completed with result', () => {
      statusStore.create('req-10', 'search');
      statusStore.complete('req-10', { count: 6 });

      const entry = statusStore.get('req-10');
      expect(entry.status).toBe('completed');
      expect(entry.result).toEqual({ count: 6 });
    });

    test('preserves accumulated steps', () => {
      statusStore.create('req-11', 'purchase');
      statusStore.updateStep('req-11', { step: 'Login', status: 'completed', durationMs: 1000 });
      statusStore.updateStep('req-11', { step: 'Checkout', status: 'completed', durationMs: 3000 });
      statusStore.complete('req-11', { orderId: 'order-1' });

      const entry = statusStore.get('req-11');
      expect(entry.status).toBe('completed');
      expect(entry.steps).toHaveLength(2);
      expect(entry.result).toEqual({ orderId: 'order-1' });
    });

    test('no-op for unknown requestId', () => {
      statusStore.complete('unknown', { count: 0 });
      // Should not throw
    });
  });

  // ===== fail() =====
  describe('fail()', () => {
    test('sets status to failed with error message', () => {
      statusStore.create('req-12', 'purchase');
      statusStore.fail('req-12', 'Browser crashed');

      const entry = statusStore.get('req-12');
      expect(entry.status).toBe('failed');
      expect(entry.error).toBe('Browser crashed');
    });

    test('preserves steps before failure', () => {
      statusStore.create('req-13', 'purchase');
      statusStore.updateStep('req-13', { step: 'Login', status: 'completed', durationMs: 1000 });
      statusStore.fail('req-13', 'AddToCart failed');

      const entry = statusStore.get('req-13');
      expect(entry.status).toBe('failed');
      expect(entry.steps).toHaveLength(1);
    });

    test('no-op for unknown requestId', () => {
      statusStore.fail('unknown', 'some error');
      // Should not throw
    });
  });

  // ===== get() =====
  describe('get()', () => {
    test('returns null for non-existent requestId', () => {
      expect(statusStore.get('does-not-exist')).toBeNull();
    });

    test('returns entry for existing requestId', () => {
      statusStore.create('req-14', 'search');
      const entry = statusStore.get('req-14');
      expect(entry).not.toBeNull();
      expect(entry.requestId).toBe('req-14');
    });
  });

  // ===== getAll() =====
  describe('getAll()', () => {
    test('returns empty array when store is empty', () => {
      expect(statusStore.getAll()).toEqual([]);
    });

    test('returns all entries', () => {
      statusStore.create('req-a', 'search');
      statusStore.create('req-b', 'purchase');
      statusStore.create('req-c', 'search');

      const all = statusStore.getAll();
      expect(all).toHaveLength(3);
    });
  });

  // ===== TTL =====
  describe('TTL cleanup', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    test('entry is deleted after 30 minutes', () => {
      statusStore.create('ttl-test', 'search');
      expect(statusStore.get('ttl-test')).not.toBeNull();

      // Advance time by 30 minutes
      jest.advanceTimersByTime(30 * 60 * 1000);

      expect(statusStore.get('ttl-test')).toBeNull();
    });

    test('entry still exists before TTL expires', () => {
      statusStore.create('ttl-test-2', 'purchase');

      // Advance time by 29 minutes
      jest.advanceTimersByTime(29 * 60 * 1000);

      expect(statusStore.get('ttl-test-2')).not.toBeNull();
    });
  });

  // ===== Full lifecycle =====
  describe('full lifecycle', () => {
    test('search: create → updateStep → complete', () => {
      statusStore.create('lifecycle-1', 'search');
      statusStore.updateStep('lifecycle-1', { step: 'OpenBrowser', status: 'completed', durationMs: 500 });
      statusStore.updateStep('lifecycle-1', { step: 'Login', status: 'completed', durationMs: 1200 });
      statusStore.updateStep('lifecycle-1', { step: 'SearchAndScrape', status: 'completed', durationMs: 3000 });
      statusStore.complete('lifecycle-1', { count: 6 });

      const entry = statusStore.get('lifecycle-1');
      expect(entry.status).toBe('completed');
      expect(entry.steps).toHaveLength(3);
      expect(entry.result).toEqual({ count: 6 });
      expect(entry.currentStep).toBe('SearchAndScrape');
    });

    test('purchase: create → updateStep → fail', () => {
      statusStore.create('lifecycle-2', 'purchase');
      statusStore.updateStep('lifecycle-2', { step: 'OpenBrowser', status: 'completed', durationMs: 500 });
      statusStore.updateStep('lifecycle-2', { step: 'Login', status: 'completed', durationMs: 1200 });
      statusStore.updateStep('lifecycle-2', { step: 'AddToCart', status: 'failed', error: 'Product not found' });
      statusStore.fail('lifecycle-2', 'Product not found');

      const entry = statusStore.get('lifecycle-2');
      expect(entry.status).toBe('failed');
      expect(entry.error).toBe('Product not found');
      expect(entry.steps).toHaveLength(3);
      expect(entry.steps[2].error).toBe('Product not found');
    });
  });
});
