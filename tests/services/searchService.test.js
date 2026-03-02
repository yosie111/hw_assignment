// tests/services/searchService.test.js
//
// ★ DI in action: NO jest.mock needed!
//   FakeAdapter replaces real automation — tests run instantly without Playwright.

const { FakeAdapter, DEFAULT_PRODUCTS } = require('../../src/automation/adapters/FakeAdapter');
const { executeSearch, getStatus } = require('../../src/services/searchService');
const statusStore = require('../../src/services/statusStore');

// Helper: raw product matching FakeAdapter's default format
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
  let adapter;

  beforeEach(() => {
    statusStore._clear();
    adapter = new FakeAdapter();
  });

  // ===== executeSearch — happy path =====
  describe('executeSearch() — happy path', () => {
    test('returns requestId and enriched products', async () => {
      const result = await executeSearch(adapter, { query: '', filters: {} });

      expect(result.requestId).toBeDefined();
      expect(result.products).toHaveLength(DEFAULT_PRODUCTS.length);
    });

    test('enriches each product with calc (Oracle tax breakdown)', async () => {
      adapter.setProducts([rawProduct({ price: 7.99 })]);

      const { products } = await executeSearch(adapter, { query: '', filters: {} });

      expect(products[0].calc).toBeDefined();
      expect(products[0].calc.subtotal).toBe(7.99);
      expect(products[0].calc.tax).toBe(0); // tax = 0%
      expect(products[0].calc.total).toBe(7.99);
    });

    test('preserves original product fields alongside calc', async () => {
      adapter.setProducts([rawProduct()]);

      const { products } = await executeSearch(adapter, { query: '', filters: {} });

      expect(products[0].id).toBe('sauce-labs-onesie');
      expect(products[0].title).toBe('Sauce Labs Onesie');
      expect(products[0].price).toBe(7.99);
      expect(products[0].currency).toBe('USD');
      expect(products[0].source).toBe('Saucedemo');
      expect(products[0].calc).toBeDefined();
    });

    test('adapter receives query and filters', async () => {
      await executeSearch(adapter, { query: 'onesie', filters: { maxPrice: 10 } });

      expect(adapter.searchCalls).toHaveLength(1);
      expect(adapter.searchCalls[0].query).toBe('onesie');
      expect(adapter.searchCalls[0].filters).toEqual({ maxPrice: 10 });
    });

    test('adapter receives requestId', async () => {
      await executeSearch(adapter, { query: '' });

      expect(adapter.searchCalls[0].requestId).toBeDefined();
      expect(typeof adapter.searchCalls[0].requestId).toBe('string');
    });

    test('handles empty products from adapter', async () => {
      adapter.setProducts([]);

      const result = await executeSearch(adapter, { query: 'nonexistent' });

      expect(result.products).toEqual([]);
      expect(result.requestId).toBeDefined();
    });

    test('defaults query to empty string and filters to empty object', async () => {
      await executeSearch(adapter, {});

      expect(adapter.searchCalls[0].query).toBe('');
      expect(adapter.searchCalls[0].filters).toEqual({});
    });
  });

  // ===== Gatekeeper — invalid products =====
  describe('Domain Gatekeeper — invalid products', () => {
    test('skips product with missing title', async () => {
      const warnSpy = jest.spyOn(console, 'warn').mockImplementation();

      adapter.setProducts([
        rawProduct({ title: '' }), // invalid
        rawProduct({ id: 'good', title: 'Valid Product', price: 9.99 }),
      ]);

      const { products } = await executeSearch(adapter, { query: '' });

      expect(products).toHaveLength(1);
      expect(products[0].title).toBe('Valid Product');
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('Skipping invalid product')
      );

      warnSpy.mockRestore();
    });

    test('skips product with negative price', async () => {
      const warnSpy = jest.spyOn(console, 'warn').mockImplementation();

      adapter.setProducts([
        rawProduct({ price: -5 }), // invalid
        rawProduct({ id: 'good', title: 'Good Product', price: 15.99 }),
      ]);

      const { products } = await executeSearch(adapter, { query: '' });

      expect(products).toHaveLength(1);
      expect(warnSpy).toHaveBeenCalled();

      warnSpy.mockRestore();
    });

    test('returns empty array when all products invalid', async () => {
      const warnSpy = jest.spyOn(console, 'warn').mockImplementation();

      adapter.setProducts([
        rawProduct({ title: '' }),
        rawProduct({ id: null, title: null }),
      ]);

      const { products } = await executeSearch(adapter, { query: '' });

      expect(products).toEqual([]);
      expect(warnSpy).toHaveBeenCalledTimes(2);

      warnSpy.mockRestore();
    });
  });

  // ===== Status tracking =====
  describe('status tracking', () => {
    test('creates status entry on start', async () => {
      const { requestId } = await executeSearch(adapter, { query: '' });
      const status = statusStore.get(requestId);

      expect(status).not.toBeNull();
      expect(status.type).toBe('search');
    });

    test('marks status as completed on success', async () => {
      adapter.setProducts([rawProduct()]);

      const { requestId } = await executeSearch(adapter, { query: '' });
      const status = statusStore.get(requestId);

      expect(status.status).toBe('completed');
      expect(status.result).toEqual({ count: 1 });
    });

    test('records onStep events from adapter', async () => {
      // FakeAdapter emits 3 steps: OpenBrowser, Login, SearchAndScrape
      const { requestId } = await executeSearch(adapter, { query: '' });
      const status = statusStore.get(requestId);

      expect(status.steps).toHaveLength(3);
      expect(status.steps[0].step).toBe('OpenBrowser');
      expect(status.steps[1].step).toBe('Login');
      expect(status.steps[2].step).toBe('SearchAndScrape');
    });

    test('marks status as failed when adapter throws', async () => {
      adapter.setSearchError(new Error('Browser crashed'));

      await expect(executeSearch(adapter, { query: '' })).rejects.toThrow('Browser crashed');

      const all = statusStore.getAll();
      expect(all).toHaveLength(1);
      expect(all[0].status).toBe('failed');
      expect(all[0].error).toBe('Browser crashed');
    });
  });

  // ===== getStatus =====
  describe('getStatus()', () => {
    test('returns status for existing requestId', async () => {
      const { requestId } = await executeSearch(adapter, { query: '' });
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
    test('throws adapter errors to caller (for API layer)', async () => {
      adapter.setSearchError(new Error('Network timeout'));

      await expect(executeSearch(adapter, { query: '' })).rejects.toThrow('Network timeout');
    });

    test('marks statusStore as failed before throwing', async () => {
      adapter.setSearchError(new Error('Timeout'));

      try {
        await executeSearch(adapter, { query: '' });
      } catch (_) {
        // expected
      }

      const all = statusStore.getAll();
      expect(all[0].status).toBe('failed');
    });
  });

  // ===== Oracle calc verification =====
  describe('Oracle calc per product', () => {
    test('calculates correct tax for $29.99 product', async () => {
      adapter.setProducts([rawProduct({ price: 29.99 })]);

      const { products } = await executeSearch(adapter, { query: '' });

      expect(products[0].calc.subtotal).toBe(29.99);
      expect(products[0].calc.tax).toBe(0);
      expect(products[0].calc.total).toBe(29.99);
    });

    test('each product gets independent calc', async () => {
      adapter.setProducts([
        rawProduct({ id: 'a', title: 'Product A', price: 7.99 }),
        rawProduct({ id: 'b', title: 'Product B', price: 29.99 }),
      ]);

      const { products } = await executeSearch(adapter, { query: '' });

      expect(products[0].calc.total).toBe(7.99);
      expect(products[1].calc.total).toBe(29.99);
    });
  });

  // ===== Step 6: Selection policy (recommendedId) =====
  describe('selection policy — recommendedId', () => {
    test('returns recommendedId pointing to cheapest product', async () => {
      adapter.setProducts([
        rawProduct({ id: 'expensive', title: 'Expensive', price: 49.99 }),
        rawProduct({ id: 'cheap', title: 'Cheap', price: 7.99 }),
        rawProduct({ id: 'mid', title: 'Mid', price: 15.99 }),
      ]);

      const result = await executeSearch(adapter, { query: '' });

      expect(result.recommendedId).toBe('cheap');
    });

    test('recommendedId is null when no products', async () => {
      adapter.setProducts([]);

      const result = await executeSearch(adapter, { query: 'nonexistent' });

      expect(result.recommendedId).toBeNull();
    });

    test('recommendedId matches first product when all same price', async () => {
      adapter.setProducts([
        rawProduct({ id: 'a', title: 'Product A', price: 10 }),
        rawProduct({ id: 'b', title: 'Product B', price: 10 }),
      ]);

      const result = await executeSearch(adapter, { query: '' });

      expect(result.recommendedId).toBe('a');
    });
  });

  // ===== DI proof: same tests, different adapter config =====
  describe('DI proof — adapter behavior controls service output', () => {
    test('adapter with custom products drives service results', async () => {
      const customAdapter = new FakeAdapter({
        products: [
          { id: 'x', title: 'Custom', price: 100, currency: 'EUR', source: 'Custom' },
        ],
      });

      const { products } = await executeSearch(customAdapter, { query: '' });

      expect(products).toHaveLength(1);
      expect(products[0].title).toBe('Custom');
      expect(products[0].currency).toBe('EUR');
      expect(products[0].calc.subtotal).toBe(100);
    });

    test('adapter filter behavior is respected', async () => {
      // FakeAdapter implements client-side maxPrice filtering
      const { products } = await executeSearch(adapter, {
        query: '',
        filters: { maxPrice: 10 },
      });

      // Only products with price <= 10 should be returned
      products.forEach(p => {
        expect(p.price).toBeLessThanOrEqual(10);
      });
    });
  });
});
