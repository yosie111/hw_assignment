// src/api/routes/purchaseRoutes.js
//
// POST /api/purchase — Asynchronous (Fire & Forget)
//
// ★ Facade Pattern: route delegates all coordination to ShoppingFacade.
//   The route only does: validate → facade.purchase() → respond 202.
//   Session reuse, adapter fallback, background orchestration — all hidden.
//
// ★ DI: route injects getFactory from automation into the Facade.
//   This keeps the service layer decoupled from automation internals.

const router = require('express').Router();
const { ShoppingFacade } = require('../../services/ShoppingFacade');
const { getFactory } = require('../../automation/adapters/abstractFactory');
const { purchaseSchema, validate } = require('../middleware/validators');

const facade = new ShoppingFacade(getFactory);

/**
 * POST /api/purchase
 *
 * Body: { site, sessionId?, product, shipping }
 * Response 202: { requestId, message, statusUrl }
 */
router.post('/', validate(purchaseSchema), async (req, res, next) => {
  try {
    const { site, sessionId, product, shipping } = req.validated;

    // ★ Facade: single call hides session lookup + adapter fallback + fire-and-forget
    const { requestId } = await facade.purchase({ site, sessionId, product, shipping });

    res.status(202).json({
      requestId,
      message: `Purchase initiated. Poll /api/status/${requestId} for updates.`,
      statusUrl: `/api/status/${requestId}`,
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
