// tests/api/statusRoutes.test.js

jest.mock('../../src/services/statusStore', () => ({
  get: jest.fn(),
}));

const request = require('supertest');
const app = require('../../src/api/server');
const statusStore = require('../../src/services/statusStore');

describe('GET /api/status/:requestId', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('returns 404 for unknown requestId', async () => {
    statusStore.get.mockReturnValue(null);

    const res = await request(app)
      .get('/api/status/unknown-id')
      .expect(404);

    expect(res.body.error).toBe('Request not found');
    expect(res.body.requestId).toBe('unknown-id');
  });

  test('returns running status with steps', async () => {
    statusStore.get.mockReturnValue({
      requestId: 'req-100',
      type: 'purchase',
      status: 'running',
      currentStep: 'AddToCart',
      steps: [
        { step: 'OpenBrowser', status: 'completed', durationMs: 500 },
        { step: 'Login', status: 'completed', durationMs: 1200 },
        { step: 'AddToCart', status: 'running', durationMs: null },
      ],
      result: null,
      error: null,
    });

    const res = await request(app)
      .get('/api/status/req-100')
      .expect(200);

    expect(res.body.status).toBe('running');
    expect(res.body.currentStep).toBe('AddToCart');
    expect(res.body.steps).toHaveLength(3);
  });

  test('returns completed status with result', async () => {
    statusStore.get.mockReturnValue({
      requestId: 'req-200',
      type: 'purchase',
      status: 'completed',
      currentStep: 'Checkout',
      steps: [
        { step: 'OpenBrowser', status: 'completed', durationMs: 500 },
      ],
      result: {
        orderId: 'order-abc',
        totalText: '$8.63',
        screenshots: [],
      },
      error: null,
    });

    const res = await request(app)
      .get('/api/status/req-200')
      .expect(200);

    expect(res.body.status).toBe('completed');
    expect(res.body.result.orderId).toBe('order-abc');
  });

  test('returns failed status with error', async () => {
    statusStore.get.mockReturnValue({
      requestId: 'req-300',
      type: 'purchase',
      status: 'failed',
      currentStep: 'Login',
      steps: [
        { step: 'Login', status: 'failed', error: 'Invalid credentials' },
      ],
      result: null,
      error: 'Login failed: Invalid credentials',
    });

    const res = await request(app)
      .get('/api/status/req-300')
      .expect(200);

    expect(res.body.status).toBe('failed');
    expect(res.body.error).toBe('Login failed: Invalid credentials');
  });

  // ─── Screenshot URL transformation ───
  test('transforms screenshot file paths to URLs', async () => {
    statusStore.get.mockReturnValue({
      requestId: 'req-400',
      type: 'purchase',
      status: 'completed',
      currentStep: 'Checkout',
      steps: [],
      result: {
        screenshots: [
          './screenshots/1-product_req-400.png',
          'screenshots/6-order-complete_req-400.png',
          'C:\\project\\screenshots\\3-cart_req-400.png',
        ],
      },
      error: null,
    });

    const res = await request(app)
      .get('/api/status/req-400')
      .expect(200);

    expect(res.body.result.screenshotUrls).toEqual([
      '/api/screenshots/1-product_req-400.png',
      '/api/screenshots/6-order-complete_req-400.png',
      '/api/screenshots/3-cart_req-400.png',
    ]);
  });

  test('preserves original screenshots array alongside URLs', async () => {
    statusStore.get.mockReturnValue({
      requestId: 'req-500',
      type: 'purchase',
      status: 'completed',
      steps: [],
      result: {
        screenshots: ['./screenshots/proof.png'],
      },
      error: null,
    });

    const res = await request(app)
      .get('/api/status/req-500')
      .expect(200);

    // Both original paths and URLs present
    expect(res.body.result.screenshots).toEqual(['./screenshots/proof.png']);
    expect(res.body.result.screenshotUrls).toEqual(['/api/screenshots/proof.png']);
  });

  test('handles result without screenshots (search status)', async () => {
    statusStore.get.mockReturnValue({
      requestId: 'req-600',
      type: 'search',
      status: 'completed',
      steps: [],
      result: { count: 6 },
      error: null,
    });

    const res = await request(app)
      .get('/api/status/req-600')
      .expect(200);

    expect(res.body.result.count).toBe(6);
    expect(res.body.result.screenshotUrls).toBeUndefined();
  });
});
