// src/api/routes/searchRoutes.js
//
// POST /api/search — Synchronous search
//
// Flow: validate → executeSearch() → 200 { requestId, products[] }
// Search is synchronous by design: user waits for results (5-10 sec),
// there's nothing useful to show during that time.

const router = require('express').Router();
const { executeSearch } = require('../../services/searchService');
const { searchSchema, validate } = require('../middleware/validators');

/**
 * POST /api/search
 *
 * Body: { query: string, filters?: { maxPrice?: number } }
 *
 * Response 200: { requestId, products: [{ id, title, price, ..., calc }] }
 * Response 400: { error: "Validation failed", details: [...] }
 * Response 500: { error: "Search failed: ..." }
 */
router.post('/', validate(searchSchema), async (req, res, next) => {
  try {
    const { query, filters } = req.validated;
    const result = await executeSearch({ query, filters });

    res.json({
      requestId: result.requestId,
      products: result.products,
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
