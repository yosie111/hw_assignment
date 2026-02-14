// tests/services/searchService.test.js

// Mock automation BEFORE requiring searchService
jest.mock('../../src/automation', () => ({
  search: jest.fn(),
}));

const { search: mockSearch } = require('../../src/automation');
const { executeSearch, getStatus } = require('../../src/services/searchService');
const statusStore = require('../../src/services/statusStore');

// Helper: raw product as automation returns from DOM
const rawProduct = (overrides = {}) => ({
  id: 'sauce-labs-onesie',
  title: 'Sauce Labs Onesie',
  price: 7.99,
  currency: 'USD',
  productUrl: 'https://www.saucedemo.com/inventory-item.html?id=2',
  imageUrl: '/static/media/sauce-onesie.jpg',
  source: 'Saucedemo',
  ...overrides,
});

describe('searchService', () => {
  beforeEach(() => {
    statusStore._clear();
    jest.clearAllMocks();
  });

  // ===== executeSearch — happy path =====
  describe('executeSearch() — happy path', () => {
    test('returns requestId and enriched products', async () => {
      mockSearch.mockResolvedValue([
        rawProduct(),
        rawProduct({ id: 'sauce-labs-backpack', title: 'Sauce Labs Backpack', price: 29.99 }),
      ]);

      const result = await executeSearch({ query: '', filters: {} });

      expect(result.requestId).toBeDefined();
      expect(result.products).toHaveLength(2);
    });

    test('enriches each product with calc (Oracle tax breakdown)', async () => {
      mockSearch.mockResolvedValue([rawProduct({ price: 7.99 })]);

      const { products } = await executeSearch({ query: '', filters: {} });

      expect(products[0].calc).toBeDefined();
      expect(products[0].calc.subtotal).toBe(7.99);
      expect(products[0].calc.tax).toBe(0); // tax = 0%
      expect(products[0].calc.total).toBe(7.99);
    });

    test('preserves original product fields alongside calc', async () => {
      mockSearch.mockResolvedValue([rawProduct()]);

      const { products } = await executeSearch({ query: '', filters: {} });

      expect(products[0].id).toBe('sauce-labs-onesie');
      expect(products[0].title).toBe('Sauce Labs Onesie');
      expect(products[0].price).toBe(7.99);
      expect(products[0].currency).toBe('USD');
      expect(products[0].source).toBe('Saucedemo');
      expect(products[0].calc).toBeDefined();
    });

    test('passes query and filters to automation', async () => {
      mockSearch.mockResolvedValue([]);

      await executeSearch({ query: 'onesie', filters: { maxPrice: 10 } });

      expect(mockSearch).toHaveBeenCalledWith(
        expect.objectContaining({
          query: 'onesie',
          filters: { maxPrice: 10 },
        })
      );
    });

    test('passes requestId and onStep callback to automation', async () => {
      mockSearch.mockResolvedValue([]);

      await executeSearch({ query: '' });

      expect(mockSearch).toHaveBeenCalledWith(
        expect.objectContaining({
          requestId: expect.any(String),
          onStep: expect.any(Function),
        })
      );
    });

    test('handles empty products from automation', async () => {
      mockSearch.mockResolvedValue([]);

      const result = await executeSearch({ query: 'nonexistent' });

      expect(result.products).toEqual([]);
      expect(result.requestId).toBeDefined();
    });

    test('defaults query to empty string and filters to empty object', async () => {
      mockSearch.mockResolvedValue([]);

      await executeSearch({});

      expect(mockSearch).toHaveBeenCalledWith(
        expect.objectContaining({
          query: '',
          filters: {},
        })
      );
    });
  });

  // ===== Gatekeeper — invalid products =====
  describe('Domain Gatekeeper — invalid products', () => {
    test('skips product with missing title', async () => {
      const warnSpy = jest.spyOn(console, 'warn').mockImplementation();

      mockSearch.mockResolvedValue([
        rawProduct({ title: '' }), // invalid
        rawProduct({ id: 'good', title: 'Valid Product', price: 9.99 }),
      ]);

      const { products } = await executeSearch({ query: '' });

      expect(products).toHaveLength(1);
      expect(products[0].title).toBe('Valid Product');
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('Skipping invalid product')
      );

      warnSpy.mockRestore();
    });

    test('skips product with negative price', async () => {
      const warnSpy = jest.spyOn(console, 'warn').mockImplementation();

      mockSearch.mockResolvedValue([
        rawProduct({ price: -5 }), // invalid
        rawProduct({ id: 'good', title: 'Good Product', price: 15.99 }),
      ]);

      const { products } = await executeSearch({ query: '' });

      expect(products).toHaveLength(1);
      expect(warnSpy).toHaveBeenCalled();

      warnSpy.mockRestore();
    });

    test('returns empty array when all products invalid', async () => {
      const warnSpy = jest.spyOn(console, 'warn').mockImplementation();

      mockSearch.mockResolvedValue([
        rawProduct({ title: '' }),
        rawProduct({ id: null, title: null }),
      ]);

      const { products } = await executeSearch({ query: '' });

      expect(products).toEqual([]);
      expect(warnSpy).toHaveBeenCalledTimes(2);

      warnSpy.mockRestore();
    });
  });

  // ===== Status tracking =====
  describe('status tracking', () => {
    test('creates status entry on start', async () => {
      mockSearch.mockResolvedValue([]);

      const { requestId } = await executeSearch({ query: '' });
      const status = statusStore.get(requestId);

      expect(status).not.toBeNull();
      expect(status.type).toBe('search');
    });

    test('marks status as completed on success', async () => {
      mockSearch.mockResolvedValue([rawProduct()]);

      const { requestId } = await executeSearch({ query: '' });
      const status = statusStore.get(requestId);

      expect(status.status).toBe('completed');
      expect(status.result).toEqual({ count: 1 });
    });

    test('records onStep events from automation', async () => {
      mockSearch.mockImplementation(async ({ onStep }) => {
        onStep({ step: 'OpenBrowser', status: 'completed', durationMs: 500 });
        onStep({ step: 'Login', status: 'completed', durationMs: 1200 });
        onStep({ step: 'SearchAndScrape', status: 'completed', durationMs: 3000 });
        return [rawProduct()];
      });

      const { requestId } = await executeSearch({ query: '' });
      const status = statusStore.get(requestId);

      expect(status.steps).toHaveLength(3);
      expect(status.steps[0].step).toBe('OpenBrowser');
      expect(status.steps[1].step).toBe('Login');
      expect(status.steps[2].step).toBe('SearchAndScrape');
    });

    test('marks status as failed when automation throws', async () => {
      mockSearch.mockRejectedValue(new Error('Browser crashed'));

      await expect(executeSearch({ query: '' })).rejects.toThrow('Browser crashed');

      // Status should be marked as failed
      // We need to find the requestId — check all entries
      const all = statusStore.getAll();
      expect(all).toHaveLength(1);
      expect(all[0].status).toBe('failed');
      expect(all[0].error).toBe('Browser crashed');
    });
  });

  // ===== getStatus =====
  describe('getStatus()', () => {
    test('returns status for existing requestId', async () => {
      mockSearch.mockResolvedValue([]);

      const { requestId } = await executeSearch({ query: '' });
      const status = getStatus(requestId);

      expect(status).not.toBeNull();
      expect(status.requestId).toBe(requestId);
    });

    test('returns null for unknown requestId', () => {
      expect(getStatus('unknown')).toBeNull();
    });
  });

  // ===== Error propagation =====
  describe('error propagation', () => {
    test('throws automation errors to caller (for API layer)', async () => {
      mockSearch.mockRejectedValue(new Error('Network timeout'));

      await expect(executeSearch({ query: '' })).rejects.toThrow('Network timeout');
    });

    test('marks statusStore as failed before throwing', async () => {
      mockSearch.mockRejectedValue(new Error('Timeout'));

      try {
        await executeSearch({ query: '' });
      } catch (_) {
        // expected
      }

      const all = statusStore.getAll();
      expect(all[0].status).toBe('failed');
    });
  });

  // ===== Multiple products — Oracle calc verification =====
  describe('Oracle calc per product', () => {
    test('calculates correct tax for $29.99 product', async () => {
      mockSearch.mockResolvedValue([rawProduct({ price: 29.99 })]);

      const { products } = await executeSearch({ query: '' });

      // tax = 0%
      expect(products[0].calc.subtotal).toBe(29.99);
      expect(products[0].calc.tax).toBe(0);
      expect(products[0].calc.total).toBe(29.99);
    });

    test('calculates correct tax for $49.99 product', async () => {
      mockSearch.mockResolvedValue([rawProduct({ price: 49.99 })]);

      const { products } = await executeSearch({ query: '' });

      // tax = 0%
      expect(products[0].calc.subtotal).toBe(49.99);
      expect(products[0].calc.tax).toBe(0);
      expect(products[0].calc.total).toBe(49.99);
    });

    test('each product gets independent calc', async () => {
      mockSearch.mockResolvedValue([
        rawProduct({ id: 'a', title: 'Product A', price: 7.99 }),
        rawProduct({ id: 'b', title: 'Product B', price: 29.99 }),
      ]);

      const { products } = await executeSearch({ query: '' });

      expect(products[0].calc.total).toBe(7.99);
      expect(products[1].calc.total).toBe(29.99);
    });
  });
});
