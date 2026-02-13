// tests/api/searchRoutes.test.js

jest.mock('../../src/services/searchService', () => ({
  executeSearch: jest.fn(),
}));

const request = require('supertest');
const app = require('../../src/api/server');
const { executeSearch } = require('../../src/services/searchService');

describe('POST /api/search', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('returns 200 with products on success', async () => {
    executeSearch.mockResolvedValue({
      requestId: 'req-123',
      products: [
        { id: '1', title: 'Onesie', price: 7.99, calc: { subtotal: 7.99, tax: 0.64, total: 8.63 } },
      ],
    });

    const res = await request(app)
      .post('/api/search')
      .send({ query: 'onesie' })
      .expect(200);

    expect(res.body.requestId).toBe('req-123');
    expect(res.body.products).toHaveLength(1);
    expect(res.body.products[0].title).toBe('Onesie');
    expect(res.body.products[0].calc.total).toBe(8.63);
  });

  test('passes query and filters to executeSearch', async () => {
    executeSearch.mockResolvedValue({ requestId: 'req-456', products: [] });

    await request(app)
      .post('/api/search')
      .send({ query: 'sauce', filters: { maxPrice: 15 } })
      .expect(200);

    expect(executeSearch).toHaveBeenCalledWith({
      query: 'sauce',
      filters: { maxPrice: 15 },
    });
  });

  test('applies defaults for empty body', async () => {
    executeSearch.mockResolvedValue({ requestId: 'req-789', products: [] });

    await request(app)
      .post('/api/search')
      .send({})
      .expect(200);

    expect(executeSearch).toHaveBeenCalledWith({
      query: '',
      filters: {},
    });
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
