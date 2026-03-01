// tests/api/purchaseRoutes.test.js
//
// ★ DI-aware: mocks both the service AND the adapter factory.

jest.mock('../../src/services/purchaseService', () => ({
  executePurchase: jest.fn(),
}));

jest.mock('../../src/automation/adapters/adapterFactory', () => ({
  createAdapter: jest.fn(() => ({ name: 'mock-adapter' })),
  getAvailableSites: jest.fn(() => ['saucedemo', 'amazon']),
}));

const request = require('supertest');
const app = require('../../src/api/server');
const { executePurchase } = require('../../src/services/purchaseService');
const { createAdapter } = require('../../src/automation/adapters/adapterFactory');

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
    executePurchase.mockResolvedValue({ requestId: 'purchase-001' });

    const res = await request(app)
      .post('/api/purchase')
      .send(validBody)
      .expect(202);

    expect(res.body.requestId).toBe('purchase-001');
    expect(res.body.statusUrl).toBe('/api/status/purchase-001');
    expect(res.body.message).toContain('Purchase initiated');
  });

  test('creates adapter and passes it with product/shipping to executePurchase', async () => {
    executePurchase.mockResolvedValue({ requestId: 'purchase-002' });

    await request(app)
      .post('/api/purchase')
      .send(validBody)
      .expect(202);

    // ★ Verify DI: route created adapter and injected it as 1st arg
    expect(createAdapter).toHaveBeenCalledWith('saucedemo');
    expect(executePurchase).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'mock-adapter' }),  // 1st arg: adapter
      expect.objectContaining({                            // 2nd arg: params
        product: expect.objectContaining({
          id: 'sauce-labs-onesie',
          title: 'Sauce Labs Onesie',
          price: 7.99,
        }),
        shipping: expect.objectContaining({
          firstName: 'Test',
          lastName: 'User',
          postalCode: '12345',
        }),
      })
    );
  });

  test('applies default currency and source', async () => {
    executePurchase.mockResolvedValue({ requestId: 'purchase-003' });

    await request(app)
      .post('/api/purchase')
      .send(validBody)
      .expect(202);

    // 2nd argument (index [1]) is now the params object
    const params = executePurchase.mock.calls[0][1];
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
    expect(executePurchase).not.toHaveBeenCalled();
  });

  test('returns 400 when shipping is missing', async () => {
    const res = await request(app)
      .post('/api/purchase')
      .send({ product: validBody.product })
      .expect(400);

    expect(res.body.error).toBe('Validation failed');
  });

  test('returns 400 when product.title is empty', async () => {
    const res = await request(app)
      .post('/api/purchase')
      .send({
        product: { id: 'x', title: '', price: 5 },
        shipping: validBody.shipping,
      })
      .expect(400);

    expect(res.body.details.some(d => d.field.includes('title'))).toBe(true);
  });

  test('returns 400 when price is negative', async () => {
    const res = await request(app)
      .post('/api/purchase')
      .send({
        product: { id: 'x', title: 'X', price: -1 },
        shipping: validBody.shipping,
      })
      .expect(400);

    expect(res.body.details.some(d => d.field.includes('price'))).toBe(true);
  });

  test('returns 400 when postalCode is empty', async () => {
    const res = await request(app)
      .post('/api/purchase')
      .send({
        product: validBody.product,
        shipping: { firstName: 'A', lastName: 'B', postalCode: '' },
      })
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
  test('returns 500 when service throws', async () => {
    executePurchase.mockRejectedValue(new Error('Validation failed in service'));

    const res = await request(app)
      .post('/api/purchase')
      .send(validBody)
      .expect(500);

    expect(res.body.error).toBe('Validation failed in service');
  });
});
