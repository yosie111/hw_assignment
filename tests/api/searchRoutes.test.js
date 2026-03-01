// tests/api/searchRoutes.test.js
//
// ★ DI-aware: mocks both the service AND the adapter factory.
//   The route creates adapter via factory and passes it to service.

jest.mock('../../src/services/searchService', () => ({
  executeSearch: jest.fn(),
}));

jest.mock('../../src/automation/adapters/adapterFactory', () => ({
  createAdapter: jest.fn(() => ({ name: 'mock-adapter' })),
  getAvailableSites: jest.fn(() => ['saucedemo', 'amazon']),
}));

const request = require('supertest');
const app = require('../../src/api/server');
const { executeSearch } = require('../../src/services/searchService');
const { createAdapter } = require('../../src/automation/adapters/adapterFactory');

describe('POST /api/search', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('returns 200 with products on success', async () => {
    executeSearch.mockResolvedValue({
      requestId: 'req-123',
      products: [
        { id: '1', title: 'Onesie', price: 7.99, calc: { subtotal: 7.99, tax: 0, total: 7.99 } },
      ],
    });

    const res = await request(app)
      .post('/api/search')
      .send({ query: 'onesie' })
      .expect(200);

    expect(res.body.requestId).toBe('req-123');
    expect(res.body.products).toHaveLength(1);
    expect(res.body.products[0].title).toBe('Onesie');
    expect(res.body.products[0].calc.total).toBe(7.99);
  });

  test('creates adapter and passes it to executeSearch', async () => {
    executeSearch.mockResolvedValue({ requestId: 'req-456', products: [] });

    await request(app)
      .post('/api/search')
      .send({ query: 'sauce', filters: { maxPrice: 15 } })
      .expect(200);

    // ★ Verify DI: route created adapter and injected it as 1st arg
    expect(createAdapter).toHaveBeenCalledWith('saucedemo');
    expect(executeSearch).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'mock-adapter' }),  // 1st arg: adapter
      expect.objectContaining({                            // 2nd arg: params
        query: 'sauce',
        filters: { maxPrice: 15 },
      })
    );
  });

  test('applies defaults for empty body', async () => {
    executeSearch.mockResolvedValue({ requestId: 'req-789', products: [] });

    await request(app)
      .post('/api/search')
      .send({})
      .expect(200);

    expect(executeSearch).toHaveBeenCalledWith(
      expect.anything(),                                   // adapter
      expect.objectContaining({                            // params with defaults
        query: '',
        filters: {},
      })
    );
  });

  test('returns 400 for invalid maxPrice', async () => {
    const res = await request(app)
      .post('/api/search')
      .send({ query: 'test', filters: { maxPrice: -5 } })
      .expect(400);

    expect(res.body.error).toBe('Validation failed');
    expect(res.body.details).toBeDefined();
    expect(executeSearch).not.toHaveBeenCalled();
  });

  test('returns 500 when service throws', async () => {
    executeSearch.mockRejectedValue(new Error('Browser crashed'));

    const res = await request(app)
      .post('/api/search')
      .send({ query: 'test' })
      .expect(500);

    expect(res.body.error).toBe('Browser crashed');
  });

  test('returns empty products array when no results', async () => {
    executeSearch.mockResolvedValue({ requestId: 'req-empty', products: [] });

    const res = await request(app)
      .post('/api/search')
      .send({ query: 'nonexistent' })
      .expect(200);

    expect(res.body.products).toEqual([]);
  });
});
