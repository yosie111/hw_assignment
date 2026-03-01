// src/api/middleware/validators.js
//
// Zod schemas for request validation + Express middleware factory.
//
// ★ DI Change: site enum is built dynamically from adapterFactory.
//   When a new adapter is registered, validators automatically accept it.
//
// Design:
//   - searchSchema: permissive (empty query = all products)
//   - purchaseSchema: strict (all fields required for checkout)
//   - validate(schema): middleware that attaches req.validated on success,
//     or returns 400 with structured error details on failure.

const { z } = require('zod');
const { getAvailableSites } = require('../../automation/adapters/adapterFactory');

// ★ Dynamic site enum — driven by adapter registry
const availableSites = getAvailableSites();
const siteEnum = z.enum(/** @type {[string, ...string[]]} */ (availableSites)).default(availableSites[0]);

// ─── Search Schema ───
const searchSchema = z.object({
  site: siteEnum,
  query: z.string().default(''),
  filters: z.object({
    maxPrice: z.number().positive().optional(),
  }).optional().default({}),
});

// ─── Purchase Schema ───
const purchaseSchema = z.object({
  site: siteEnum,
  product: z.object({
    id: z.string().min(1, 'Product ID is required'),
    title: z.string().min(1, 'Product title is required'),
    price: z.number().nonnegative('Price must be non-negative'),
    currency: z.string().default('USD'),
    source: z.string().default('Saucedemo'),
    productUrl: z.string().default(''),
    imageUrl: z.string().nullable().default(null),
  }),
  shipping: z.object({
    firstName: z.string().min(1, 'First name is required'),
    lastName: z.string().min(1, 'Last name is required'),
    postalCode: z.string().min(1, 'Postal code is required'),
  }),
});

/**
 * Express middleware factory: validates req.body against a Zod schema.
 *
 * On success → attaches validated (with defaults applied) to req.validated, calls next().
 * On failure → 400 with structured error details: [{ field, message }].
 *
 * @param {z.ZodSchema} schema
 * @returns {Function} Express middleware (req, res, next)
 */
function validate(schema) {
  return (req, res, next) => {
    const result = schema.safeParse(req.body);

    if (!result.success) {
      return res.status(400).json({
        error: 'Validation failed',
        details: result.error.issues.map(issue => ({
          field: issue.path.join('.'),
          message: issue.message,
        })),
      });
    }

    req.validated = result.data;
    next();
  };
}

module.exports = { searchSchema, purchaseSchema, validate };
