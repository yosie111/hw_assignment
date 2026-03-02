// src/api/routes/searchRoutes.js
//
// POST /api/search — Synchronous search
//
// ★ DI: Route handler creates the adapter and injects it into the service.
//   This is the "composition root" — the only place that knows about
//   both the factory and the service.
//
// Flow: validate → createAdapter(site) → executeSearch(adapter, payload) → 200

const router = require('express').Router();
const { executeSearch } = require('../../services/searchService');
const { createAdapter } = require('../../automation/adapters/adapterFactory');
const { searchSchema, validate } = require('../middleware/validators');

/**
 * POST /api/search
 *
 * Body: { site?: string, query: string, filters?: { maxPrice?: number } }
 *
 * Response 200: { requestId, products: [{ id, title, price, …, calc }] }
 * Response 400: { error: "Validation failed", details: [...] }
 * Response 500: { error: "Search failed: ..." }
 */
router.post('/', validate(searchSchema), async (req, res, next) => {
  try {
    const { site, query, filters } = req.validated;

    // ★ Composition Root: create adapter here, inject into service
    const adapter = createAdapter(site);
    const result = await executeSearch(adapter, { query, filters });

    res.json({
      requestId: result.requestId,
      products: result.products,
      recommendedId: result.recommendedId,
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
