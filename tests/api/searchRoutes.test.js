// tests/api/searchRoutes.test.js
//
// ★ Facade-aware: mocks ShoppingFacade.
//   The route delegates everything to the Facade.
//
// ★ DI: ShoppingFacade now takes getFactory in constructor.
//   We mock the constructor to return our mockFacade directly.

jest.mock('../../src/services/ShoppingFacade', () => {
  const mockFacade = {
    search: jest.fn(),
    purchase: jest.fn(),
  };
  return {
    ShoppingFacade: jest.fn(() => mockFacade),
    _mockFacade: mockFacade,
  };
});

// Mock abstractFactory for validators.js (reads available sites at import time)
jest.mock('../../src/automation/adapters/abstractFactory', () => ({
  getFactory: jest.fn(),
  getAvailableSites: jest.fn(() => ['saucedemo', 'amazon', 'toolshop']),
}));

const request = require('supertest');
const app = require('../../src/api/server');
const { _mockFacade } = require('../../src/services/ShoppingFacade');

describe('POST /api/search', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('returns 200 with products and sessionId on success', async () => {
    _mockFacade.search.mockResolvedValue({
      requestId: 'req-123',
      products: [
        { id: '1', title: 'Onesie', price: 7.99, calc: { subtotal: 7.99, tax: 0, total: 7.99 } },
      ],
      recommendedId: '1',
      sessionId: 'session-abc',
    });

    const res = await request(app)
      .post('/api/search')
      .send({ query: 'onesie' })
      .expect(200);

    expect(res.body.requestId).toBe('req-123');
    expect(res.body.products).toHaveLength(1);
    expect(res.body.products[0].title).toBe('Onesie');
    expect(res.body.sessionId).toBe('session-abc');
  });

  test('facade receives site and query params', async () => {
    _mockFacade.search.mockResolvedValue({ requestId: 'req-456', products: [], sessionId: 's' });

    await request(app)
      .post('/api/search')
      .send({ query: 'sauce', filters: { maxPrice: 15 } })
      .expect(200);

    expect(_mockFacade.search).toHaveBeenCalledWith(
      'saucedemo',
      expect.objectContaining({ query: 'sauce', filters: { maxPrice: 15 } })
    );
  });

  test('applies defaults for empty body', async () => {
    _mockFacade.search.mockResolvedValue({ requestId: 'req-789', products: [], sessionId: 's' });

    await request(app)
      .post('/api/search')
      .send({})
      .expect(200);

    expect(_mockFacade.search).toHaveBeenCalledWith(
      'saucedemo',
      expect.objectContaining({ query: '', filters: {} })
    );
  });

  test('returns 400 for invalid maxPrice', async () => {
    const res = await request(app)
      .post('/api/search')
      .send({ query: 'test', filters: { maxPrice: -5 } })
      .expect(400);

    expect(res.body.error).toBe('Validation failed');
    expect(_mockFacade.search).not.toHaveBeenCalled();
  });

  test('returns 500 when facade throws', async () => {
    _mockFacade.search.mockRejectedValue(new Error('Browser crashed'));

    const res = await request(app)
      .post('/api/search')
      .send({ query: 'test' })
      .expect(500);

    expect(res.body.error).toBe('Browser crashed');
  });

  test('returns empty products array when no results', async () => {
    _mockFacade.search.mockResolvedValue({ requestId: 'req-empty', products: [], sessionId: 's' });

    const res = await request(app)
      .post('/api/search')
      .send({ query: 'nonexistent' })
      .expect(200);

    expect(res.body.products).toEqual([]);
  });
});
