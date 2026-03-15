// tests/services/ShoppingFacade.test.js
//
// Tests the Facade pattern: ShoppingFacade coordinates
// factory (injected via DI) + searchService + sessionStore + purchaseService
// behind a simplified interface.
//
// ★ DI: getFactory is injected via constructor — no automation imports in Facade.

jest.mock('../../src/services/searchService', () => ({
  executeSearch: jest.fn(),
}));
jest.mock('../../src/services/purchaseService', () => ({
  executePurchase: jest.fn(),
}));
jest.mock('../../src/services/sessionStore', () => ({
  store: jest.fn(() => 'session-123'),
  consume: jest.fn(() => null),
  SessionStore: { getInstance: jest.fn() },
  getInstance: jest.fn(),
}));

const { ShoppingFacade } = require('../../src/services/ShoppingFacade');
const { executeSearch } = require('../../src/services/searchService');
const { executePurchase } = require('../../src/services/purchaseService');
const sessionStore = require('../../src/services/sessionStore');

// ★ Mock factory injected via DI (not via jest.mock of automation)
const mockCreateAdapter = jest.fn(() => ({ name: 'mock-adapter', isAlive: () => true }));
const mockGetTaxRate = jest.fn(() => 0.08);
const mockGetFactory = jest.fn(() => ({
  createAdapter: mockCreateAdapter,
  getTaxRate: mockGetTaxRate,
}));

describe('ShoppingFacade (Facade Pattern)', () => {
  let facade;

  beforeEach(() => {
    jest.clearAllMocks();
    mockCreateAdapter.mockReturnValue({ name: 'mock-adapter', isAlive: () => true });
    mockGetTaxRate.mockReturnValue(0.08);
    facade = new ShoppingFacade(mockGetFactory);
  });

  // ═══ Constructor DI validation ═══
  describe('constructor', () => {
    test('throws if getFactory is not provided', () => {
      expect(() => new ShoppingFacade()).toThrow('ShoppingFacade requires a getFactory function');
    });

    test('throws if getFactory is not a function', () => {
      expect(() => new ShoppingFacade('not-a-function')).toThrow('ShoppingFacade requires a getFactory function');
    });

    test('accepts a valid getFactory function', () => {
      expect(() => new ShoppingFacade(mockGetFactory)).not.toThrow();
    });
  });

  // ═══ search() ═══
  describe('search()', () => {
    test('coordinates: getFactory → createAdapter → executeSearch → sessionStore.store', async () => {
      executeSearch.mockResolvedValue({
        requestId: 'req-1',
        products: [{ id: '1', title: 'P', price: 10 }],
        recommendedId: '1',
      });

      const result = await facade.search('saucedemo', { query: 'test', filters: {} });

      // 1. Got factory for site (via injected getFactory)
      expect(mockGetFactory).toHaveBeenCalledWith('saucedemo');
      // 2. Created adapter via factory
      expect(mockCreateAdapter).toHaveBeenCalled();
      // 3. Passed adapter + taxRate to search
      expect(executeSearch).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'mock-adapter' }),
        { query: 'test', filters: {}, taxRate: 0.08 }
      );
      // 4. Stored adapter in session
      expect(sessionStore.store).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'mock-adapter' })
      );
      // 5. Returned combined result
      expect(result.requestId).toBe('req-1');
      expect(result.products).toHaveLength(1);
      expect(result.sessionId).toBe('session-123');
      expect(result.taxRate).toBe(0.08);
    });

    test('defaults query and filters', async () => {
      executeSearch.mockResolvedValue({ requestId: 'r', products: [], recommendedId: null });

      await facade.search('saucedemo', {});

      expect(executeSearch).toHaveBeenCalledWith(
        expect.anything(),
        { query: undefined, filters: undefined, taxRate: 0.08 }
      );
    });
  });

  // ═══ purchase() ═══
  describe('purchase()', () => {
    const product = { id: '1', title: 'P', price: 10 };
    const shipping = { firstName: 'A', lastName: 'B', postalCode: '123' };

    test('uses session adapter when sessionId is valid', async () => {
      const sessionAdapter = { name: 'session-adapter', isAlive: () => true };
      sessionStore.consume.mockReturnValue(sessionAdapter);
      executePurchase.mockResolvedValue({ requestId: 'pur-1' });

      await facade.purchase({ site: 'saucedemo', sessionId: 'sess-1', product, shipping });

      // Used session adapter, NOT factory
      expect(sessionStore.consume).toHaveBeenCalledWith('sess-1');
      expect(mockCreateAdapter).not.toHaveBeenCalled();
      expect(executePurchase).toHaveBeenCalledWith(sessionAdapter, { product, shipping, taxRate: 0.08 });
    });

    test('falls back to createAdapter when no session', async () => {
      sessionStore.consume.mockReturnValue(null);
      executePurchase.mockResolvedValue({ requestId: 'pur-2' });

      await facade.purchase({ site: 'saucedemo', product, shipping });

      expect(mockCreateAdapter).toHaveBeenCalled();
      expect(executePurchase).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'mock-adapter' }),
        { product, shipping, taxRate: 0.08 }
      );
    });

    test('falls back to createAdapter when session adapter is dead', async () => {
      const deadAdapter = { name: 'dead', isAlive: () => false };
      sessionStore.consume.mockReturnValue(deadAdapter);
      executePurchase.mockResolvedValue({ requestId: 'pur-3' });

      await facade.purchase({ site: 'saucedemo', sessionId: 'expired', product, shipping });

      // Dead adapter → fallback to factory
      expect(mockCreateAdapter).toHaveBeenCalled();
    });
  });

  // ═══ Facade hides complexity ═══
  describe('API simplicity', () => {
    test('search() returns a flat result — caller never touches adapters or sessions', async () => {
      executeSearch.mockResolvedValue({ requestId: 'r', products: [], recommendedId: null });

      const result = await facade.search('saucedemo', { query: '' });

      // Caller only sees: requestId, products, recommendedId, sessionId, taxRate
      expect(Object.keys(result).sort()).toEqual(
        ['products', 'recommendedId', 'requestId', 'sessionId', 'taxRate']
      );
    });

    test('purchase() returns only { requestId } — caller never touches adapters', async () => {
      sessionStore.consume.mockReturnValue(null);
      executePurchase.mockResolvedValue({ requestId: 'pur-x' });

      const result = await facade.purchase({
        site: 'saucedemo',
        product: { id: '1', title: 'P', price: 10 },
        shipping: { firstName: 'A', lastName: 'B', postalCode: '1' },
      });

      expect(result).toEqual({ requestId: 'pur-x' });
    });
  });
});
