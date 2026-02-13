// tests/api/validators.test.js

const { searchSchema, purchaseSchema, validate } = require('../../src/api/middleware/validators');

describe('Zod Schemas', () => {
  // ===== searchSchema =====
  describe('searchSchema', () => {
    test('accepts valid search with query and filters', () => {
      const result = searchSchema.safeParse({
        query: 'sauce',
        filters: { maxPrice: 20 },
      });
      expect(result.success).toBe(true);
      expect(result.data.query).toBe('sauce');
      expect(result.data.filters.maxPrice).toBe(20);
    });

    test('defaults query to empty string', () => {
      const result = searchSchema.safeParse({});
      expect(result.success).toBe(true);
      expect(result.data.query).toBe('');
    });

    test('defaults filters to empty object', () => {
      const result = searchSchema.safeParse({ query: 'test' });
      expect(result.success).toBe(true);
      expect(result.data.filters).toEqual({});
    });

    test('rejects negative maxPrice', () => {
      const result = searchSchema.safeParse({
        query: 'test',
        filters: { maxPrice: -5 },
      });
      expect(result.success).toBe(false);
    });

    test('accepts empty body (all defaults)', () => {
      const result = searchSchema.safeParse({});
      expect(result.success).toBe(true);
      expect(result.data).toEqual({ query: '', filters: {} });
    });
  });

  // ===== purchaseSchema =====
  describe('purchaseSchema', () => {
    const validPurchase = {
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

    test('accepts valid purchase', () => {
      const result = purchaseSchema.safeParse(validPurchase);
      expect(result.success).toBe(true);
      expect(result.data.product.title).toBe('Sauce Labs Onesie');
      expect(result.data.shipping.firstName).toBe('Test');
    });

    test('applies default currency USD', () => {
      const result = purchaseSchema.safeParse(validPurchase);
      expect(result.success).toBe(true);
      expect(result.data.product.currency).toBe('USD');
    });

    test('applies default source Saucedemo', () => {
      const result = purchaseSchema.safeParse(validPurchase);
      expect(result.data.product.source).toBe('Saucedemo');
    });

    test('rejects missing product.id', () => {
      const input = {
        product: { title: 'Test', price: 5 },
        shipping: { firstName: 'A', lastName: 'B', postalCode: '1' },
      };
      const result = purchaseSchema.safeParse(input);
      expect(result.success).toBe(false);
      const fields = result.error.issues.map(i => i.path.join('.'));
      expect(fields).toContain('product.id');
    });

    test('rejects missing product.title', () => {
      const input = {
        product: { id: 'x', price: 5 },
        shipping: { firstName: 'A', lastName: 'B', postalCode: '1' },
      };
      const result = purchaseSchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    test('rejects negative price', () => {
      const input = {
        product: { id: 'x', title: 'X', price: -1 },
        shipping: { firstName: 'A', lastName: 'B', postalCode: '1' },
      };
      const result = purchaseSchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    test('rejects empty firstName', () => {
      const input = {
        product: { id: 'x', title: 'X', price: 5 },
        shipping: { firstName: '', lastName: 'B', postalCode: '1' },
      };
      const result = purchaseSchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    test('rejects empty lastName', () => {
      const input = {
        product: { id: 'x', title: 'X', price: 5 },
        shipping: { firstName: 'A', lastName: '', postalCode: '1' },
      };
      const result = purchaseSchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    test('rejects empty postalCode', () => {
      const input = {
        product: { id: 'x', title: 'X', price: 5 },
        shipping: { firstName: 'A', lastName: 'B', postalCode: '' },
      };
      const result = purchaseSchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    test('rejects missing shipping entirely', () => {
      const input = {
        product: { id: 'x', title: 'X', price: 5 },
      };
      const result = purchaseSchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    test('rejects missing product entirely', () => {
      const input = {
        shipping: { firstName: 'A', lastName: 'B', postalCode: '1' },
      };
      const result = purchaseSchema.safeParse(input);
      expect(result.success).toBe(false);
    });
  });
});

// ===== validate() middleware =====
describe('validate() middleware', () => {
  function mockReqResNext(body) {
    const req = { body };
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
    const next = jest.fn();
    return { req, res, next };
  }

  test('attaches validated data to req.validated on success', () => {
    const { req, res, next } = mockReqResNext({ query: 'test' });
    validate(searchSchema)(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(req.validated).toBeDefined();
    expect(req.validated.query).toBe('test');
  });

  test('returns 400 with details on validation failure', () => {
    const { req, res, next } = mockReqResNext({
      product: {},
      shipping: {},
    });
    validate(purchaseSchema)(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        error: 'Validation failed',
        details: expect.arrayContaining([
          expect.objectContaining({ field: expect.any(String), message: expect.any(String) }),
        ]),
      })
    );
  });

  test('details include correct field paths', () => {
    const { req, res, next } = mockReqResNext({
      product: { id: 'x', title: 'X', price: -1 },
      shipping: { firstName: '', lastName: 'B', postalCode: '1' },
    });
    validate(purchaseSchema)(req, res, next);

    const details = res.json.mock.calls[0][0].details;
    const fields = details.map(d => d.field);
    expect(fields.some(f => f.includes('price') || f.includes('firstName'))).toBe(true);
  });
});
