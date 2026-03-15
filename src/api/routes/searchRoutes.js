// src/api/routes/searchRoutes.js
//
// POST /api/search — Synchronous search
//
// ★ Facade Pattern: route delegates all coordination to ShoppingFacade.
//   The route only does: validate → facade.search() → respond.
//   It never touches adapters, session store, or services directly.
//
// ★ DI: route injects getFactory from automation into the Facade.
//   This keeps the service layer decoupled from automation internals.

const router = require('express').Router();
const { ShoppingFacade } = require('../../services/ShoppingFacade');
const { getFactory } = require('../../automation/adapters/abstractFactory');
const { searchSchema, validate } = require('../middleware/validators');

const facade = new ShoppingFacade(getFactory);

/**
 * POST /api/search
 *
 * Body: { site?: string, query: string, filters?: { maxPrice?: number } }
 * Response 200: { requestId, products, recommendedId, sessionId }
 */
router.post('/', validate(searchSchema), async (req, res, next) => {
  try {
    const { site, query, filters } = req.validated;

    // ★ Facade: single call hides adapter creation + search + session storage
    const result = await facade.search(site, { query, filters });

    res.json(result);
  } catch (error) {
    next(error);
  }
});

module.exports = router;
