// tests/api/purchaseRoutes.test.js
//
// ★ Facade-aware: mocks ShoppingFacade.

jest.mock('../../src/services/ShoppingFacade', () => {
  const mockFacade = {
    search: jest.fn(),
    purchase: jest.fn(),
  };
  return {
    ShoppingFacade: jest.fn(() => mockFacade),
    _mockFacade: mockFacade,
    getAvailableSites: jest.fn(() => ['saucedemo', 'amazon', 'toolshop']),
  };
});

jest.mock('../../src/automation/adapters/abstractFactory', () => ({
  getFactory: jest.fn(),
  getAvailableSites: jest.fn(() => ['saucedemo', 'amazon', 'toolshop']),
}));

const request = require('supertest');
const app = require('../../src/api/server');
const { _mockFacade } = require('../../src/services/ShoppingFacade');

const validBody = {
  product: {
    id: 'sauce-labs-onesie',
    title: 'Sauce Labs Onesie',
    price: 7.99,
  },
  shipping: {
    firstName: 'Test',
    lastName: 'User',
    postalCode: '12345',
  },
};

describe('POST /api/purchase', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('returns 202 with requestId on success', async () => {
    _mockFacade.purchase.mockResolvedValue({ requestId: 'purchase-001' });

    const res = await request(app)
      .post('/api/purchase')
      .send(validBody)
      .expect(202);

    expect(res.body.requestId).toBe('purchase-001');
    expect(res.body.statusUrl).toBe('/api/status/purchase-001');
    expect(res.body.message).toContain('Purchase initiated');
  });

  test('facade receives site, product, shipping', async () => {
    _mockFacade.purchase.mockResolvedValue({ requestId: 'purchase-002' });

    await request(app)
      .post('/api/purchase')
      .send(validBody)
      .expect(202);

    expect(_mockFacade.purchase).toHaveBeenCalledWith(
      expect.objectContaining({
        site: 'saucedemo',
        product: expect.objectContaining({ title: 'Sauce Labs Onesie' }),
        shipping: expect.objectContaining({ firstName: 'Test' }),
      })
    );
  });

  test('facade receives sessionId when provided', async () => {
    _mockFacade.purchase.mockResolvedValue({ requestId: 'purchase-session' });

    await request(app)
      .post('/api/purchase')
      .send({ ...validBody, sessionId: 'abc-session-id' })
      .expect(202);

    expect(_mockFacade.purchase).toHaveBeenCalledWith(
      expect.objectContaining({ sessionId: 'abc-session-id' })
    );
  });

  test('applies default currency and source', async () => {
    _mockFacade.purchase.mockResolvedValue({ requestId: 'purchase-003' });

    await request(app)
      .post('/api/purchase')
      .send(validBody)
      .expect(202);

    const params = _mockFacade.purchase.mock.calls[0][0];
    expect(params.product.currency).toBe('USD');
    expect(params.product.source).toBe('Saucedemo');
  });

  // ─── Validation errors (400) ───
  test('returns 400 when product is missing', async () => {
    const res = await request(app)
      .post('/api/purchase')
      .send({ shipping: validBody.shipping })
      .expect(400);

    expect(res.body.error).toBe('Validation failed');
    expect(_mockFacade.purchase).not.toHaveBeenCalled();
  });

  test('returns 400 when shipping is missing', async () => {
    await request(app)
      .post('/api/purchase')
      .send({ product: validBody.product })
      .expect(400);
  });

  test('returns 400 when product.title is empty', async () => {
    const res = await request(app)
      .post('/api/purchase')
      .send({ product: { id: 'x', title: '', price: 5 }, shipping: validBody.shipping })
      .expect(400);

    expect(res.body.details.some(d => d.field.includes('title'))).toBe(true);
  });

  test('returns 400 when price is negative', async () => {
    const res = await request(app)
      .post('/api/purchase')
      .send({ product: { id: 'x', title: 'X', price: -1 }, shipping: validBody.shipping })
      .expect(400);

    expect(res.body.details.some(d => d.field.includes('price'))).toBe(true);
  });

  test('returns 400 when postalCode is empty', async () => {
    const res = await request(app)
      .post('/api/purchase')
      .send({ product: validBody.product, shipping: { firstName: 'A', lastName: 'B', postalCode: '' } })
      .expect(400);

    expect(res.body.details.some(d => d.field.includes('postalCode'))).toBe(true);
  });

  test('returns 400 with multiple errors for empty body', async () => {
    const res = await request(app)
      .post('/api/purchase')
      .send({})
      .expect(400);

    expect(res.body.details.length).toBeGreaterThan(0);
  });

  // ─── Service errors (500) ───
  test('returns 500 when facade throws', async () => {
    _mockFacade.purchase.mockRejectedValue(new Error('Validation failed in service'));

    const res = await request(app)
      .post('/api/purchase')
      .send(validBody)
      .expect(500);

    expect(res.body.error).toBe('Validation failed in service');
  });
});
