// src/services/sessionStore.js
//
// Singleton + Double-Checked Locking — SessionStore
//
// Chapter 12 mapping:
//   Singleton ensures exactly ONE session store exists across the entire
//   application. Multiple require() calls always get the same instance.
//
// Double-Checked Locking:
//   getInstance() checks _instance twice:
//     1. Fast path: if _instance exists, return immediately (no lock overhead)
//     2. Slow path: if _instance is null, check _initializing flag to prevent
//        re-entrant initialization, then create the instance.
//
//   In Node.js (single-threaded), true thread-level locking isn't needed,
//   but the _initializing guard protects against re-entrant calls during
//   async initialization (e.g., if a timer callback triggers getInstance()
//   while the constructor is running).
//
// Why Singleton here:
//   The session store manages live browser sessions (Playwright browsers).
//   Having two stores would mean search stores an adapter in store-A but
//   purchase looks for it in store-B — session continuity breaks silently.
//   Singleton guarantees a single point of truth for all active sessions.

const { randomUUID } = require('crypto');

const SESSION_TTL_MS = 5 * 60 * 1000; // 5 minutes

class SessionStore {
  // ─── Singleton infrastructure ───

  /** @type {SessionStore|null} */
  static _instance = null;

  /** @type {boolean} - Double-Checked Locking guard */
  static _initializing = false;

  /**
   * Get the singleton instance (Double-Checked Locking).
   * @returns {SessionStore}
   */
  static getInstance() {
    // First check (fast path — no lock overhead)
    if (SessionStore._instance) {
      return SessionStore._instance;
    }

    // Second check (slow path — guarded initialization)
    if (SessionStore._initializing) {
      throw new Error('SessionStore: re-entrant initialization detected');
    }

    SessionStore._initializing = true;
    try {
      // Double-check after acquiring guard
      if (!SessionStore._instance) {
        SessionStore._instance = new SessionStore();
      }
    } finally {
      SessionStore._initializing = false;
    }

    return SessionStore._instance;
  }

  /**
   * Reset the singleton (for testing only).
   * Clears all sessions and destroys the instance.
   */
  static async _resetInstance() {
    if (SessionStore._instance) {
      await SessionStore._instance._clear();
      SessionStore._instance = null;
    }
  }

  // ─── Instance methods ───

  constructor() {
    /** @type {Map<string, { adapter, createdAt, timer }>} */
    this._sessions = new Map();
  }

  /**
   * Store an adapter instance and return a sessionId.
   * The adapter's browser stays alive until the session expires or is consumed.
   *
   * @param {SiteAdapter} adapter - Live adapter (browser may be open)
   * @returns {string} sessionId (UUID)
   */
  store(adapter) {
    const sessionId = randomUUID();

    const timer = setTimeout(() => {
      this.evict(sessionId);
    }, SESSION_TTL_MS);
    if (timer.unref) timer.unref();

    this._sessions.set(sessionId, {
      adapter,
      createdAt: new Date().toISOString(),
      timer,
    });

    return sessionId;
  }

  /**
   * Retrieve and REMOVE the adapter for a given sessionId.
   * Returns null if session expired or doesn't exist.
   * The caller takes ownership of the adapter (and must close it).
   *
   * @param {string} sessionId
   * @returns {SiteAdapter|null}
   */
  consume(sessionId) {
    if (!sessionId) return null;

    const entry = this._sessions.get(sessionId);
    if (!entry) return null;

    clearTimeout(entry.timer);
    this._sessions.delete(sessionId);

    return entry.adapter;
  }

  /**
   * Peek at a session without consuming it.
   * @param {string} sessionId
   * @returns {boolean}
   */
  has(sessionId) {
    return this._sessions.has(sessionId);
  }

  /**
   * Evict a session: close the adapter's browser and remove from map.
   * @param {string} sessionId
   */
  async evict(sessionId) {
    const entry = this._sessions.get(sessionId);
    if (!entry) return;

    clearTimeout(entry.timer);
    this._sessions.delete(sessionId);

    try {
      if (entry.adapter && typeof entry.adapter.close === 'function') {
        await entry.adapter.close();
      }
    } catch (err) {
      console.warn(`[SessionStore] Error closing adapter for session ${sessionId}: ${err.message}`);
    }
  }

  /**
   * Get count of active sessions (for monitoring/testing).
   * @returns {number}
   */
  size() {
    return this._sessions.size;
  }

  /**
   * Clear all sessions (for testing).
   */
  async _clear() {
    for (const [, entry] of this._sessions.entries()) {
      clearTimeout(entry.timer);
      try {
        if (entry.adapter && typeof entry.adapter.close === 'function') {
          await entry.adapter.close();
        }
      } catch (_) { /* ignore */ }
    }
    this._sessions.clear();
  }
}

// ─── Module exports: expose the singleton instance's methods ───
// This preserves the existing API so that all callers (routes, tests)
// continue to work without changes: require('./sessionStore').store(...)

const singleton = SessionStore.getInstance();

module.exports = {
  store:     (adapter)   => singleton.store(adapter),
  consume:   (sessionId) => singleton.consume(sessionId),
  has:       (sessionId) => singleton.has(sessionId),
  evict:     (sessionId) => singleton.evict(sessionId),
  size:      ()          => singleton.size(),
  _clear:    ()          => singleton._clear(),

  // Expose the class and getInstance for pattern-aware code and tests
  SessionStore,
  getInstance: () => SessionStore.getInstance(),
};
