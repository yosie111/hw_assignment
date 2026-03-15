// tests/services/sessionStore.test.js
//
// Tests for session continuity: sessionStore manages adapter lifecycle
// between search → purchase.
//
// Also tests the Singleton + Double-Checked Locking pattern.

const sessionStore = require('../../src/services/sessionStore');
const { SessionStore } = require('../../src/services/sessionStore');
const { FakeAdapter } = require('../../src/automation/adapters/FakeAdapter');

describe('sessionStore', () => {
  afterEach(async () => {
    await sessionStore._clear();
  });

  // ═══ Singleton + Double-Checked Locking ═══
  describe('Singleton pattern', () => {
    test('getInstance() always returns the same instance', () => {
      const a = SessionStore.getInstance();
      const b = SessionStore.getInstance();
      expect(a).toBe(b);
    });

    test('module exports proxy to the singleton instance', () => {
      // store via module export, check via getInstance
      const adapter = new FakeAdapter();
      const sessionId = sessionStore.store(adapter);

      const instance = SessionStore.getInstance();
      expect(instance.has(sessionId)).toBe(true);
    });

    test('Singleton survives across multiple require() calls', () => {
      const store1 = require('../../src/services/sessionStore');
      const store2 = require('../../src/services/sessionStore');

      const adapter = new FakeAdapter();
      const sessionId = store1.store(adapter);
      expect(store2.has(sessionId)).toBe(true);
    });
  });

  describe('store()', () => {
    test('returns a sessionId string', () => {
      const adapter = new FakeAdapter();
      const sessionId = sessionStore.store(adapter);

      expect(typeof sessionId).toBe('string');
      expect(sessionId.length).toBeGreaterThan(0);
    });

    test('increments size', () => {
      const a = new FakeAdapter();
      const b = new FakeAdapter();

      sessionStore.store(a);
      expect(sessionStore.size()).toBe(1);

      sessionStore.store(b);
      expect(sessionStore.size()).toBe(2);
    });
  });

  describe('consume()', () => {
    test('returns the stored adapter', () => {
      const adapter = new FakeAdapter();
      const sessionId = sessionStore.store(adapter);

      const retrieved = sessionStore.consume(sessionId);
      expect(retrieved).toBe(adapter);
    });

    test('removes session after consumption (one-time use)', () => {
      const adapter = new FakeAdapter();
      const sessionId = sessionStore.store(adapter);

      sessionStore.consume(sessionId);
      expect(sessionStore.consume(sessionId)).toBeNull();
      expect(sessionStore.size()).toBe(0);
    });

    test('returns null for unknown sessionId', () => {
      expect(sessionStore.consume('nonexistent')).toBeNull();
    });

    test('returns null when sessionId is null/undefined', () => {
      expect(sessionStore.consume(null)).toBeNull();
      expect(sessionStore.consume(undefined)).toBeNull();
    });
  });

  describe('has()', () => {
    test('returns true for existing session', () => {
      const adapter = new FakeAdapter();
      const sessionId = sessionStore.store(adapter);

      expect(sessionStore.has(sessionId)).toBe(true);
    });

    test('returns false after consumption', () => {
      const adapter = new FakeAdapter();
      const sessionId = sessionStore.store(adapter);

      sessionStore.consume(sessionId);
      expect(sessionStore.has(sessionId)).toBe(false);
    });
  });

  describe('evict()', () => {
    test('removes session and calls adapter.close()', async () => {
      const adapter = new FakeAdapter();
      const sessionId = sessionStore.store(adapter);

      await sessionStore.evict(sessionId);

      expect(sessionStore.has(sessionId)).toBe(false);
      expect(adapter.closeCalls).toBe(1);
    });

    test('is safe to call on nonexistent session', async () => {
      await expect(sessionStore.evict('nonexistent')).resolves.toBeUndefined();
    });
  });

  describe('_clear()', () => {
    test('closes all adapters and empties the store', async () => {
      const a = new FakeAdapter();
      const b = new FakeAdapter();
      sessionStore.store(a);
      sessionStore.store(b);

      await sessionStore._clear();

      expect(sessionStore.size()).toBe(0);
      expect(a.closeCalls).toBe(1);
      expect(b.closeCalls).toBe(1);
    });
  });

  describe('session continuity flow (search → purchase)', () => {
    test('adapter survives between store and consume', () => {
      const adapter = new FakeAdapter();

      // Simulate search: store adapter
      const sessionId = sessionStore.store(adapter);
      expect(adapter.isAlive()).toBe(true);

      // Simulate purchase: consume adapter — same instance
      const retrieved = sessionStore.consume(sessionId);
      expect(retrieved).toBe(adapter);
      expect(retrieved.isAlive()).toBe(true);
    });

    test('adapter close is tracked when purchase completes', async () => {
      const adapter = new FakeAdapter();
      const sessionId = sessionStore.store(adapter);

      // Consume for purchase
      const retrieved = sessionStore.consume(sessionId);

      // Simulate purchase completion — adapter closes browser
      await retrieved.close();

      expect(retrieved.isAlive()).toBe(false);
      expect(retrieved.closeCalls).toBe(1);
    });
  });
});
