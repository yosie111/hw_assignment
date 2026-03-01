// src/api/routes/purchaseRoutes.js
//
// POST /api/purchase — Asynchronous (Fire & Forget)
//
// ★ DI: Route handler creates the adapter and injects it into the service.
//   The adapter is captured in the closure and passed to the background
//   _runPurchase() task — no global state.
//
// Flow: validate → createAdapter(site) → executePurchase(adapter, payload) → 202 Accepted

const router = require('express').Router();
const { executePurchase } = require('../../services/purchaseService');
const { createAdapter } = require('../../automation/adapters/adapterFactory');
const { purchaseSchema, validate } = require('../middleware/validators');

/**
 * POST /api/purchase
 *
 * Body: {
 *   site?: string,
 *   product: { id, title, price, currency, source },
 *   shipping: { firstName, lastName, postalCode }
 * }
 *
 * Response 202: { requestId, message, statusUrl }
 * Response 400: { error: "Validation failed", details: [...] }
 * Response 500: { error: "Purchase initiation failed: ..." }
 */
router.post('/', validate(purchaseSchema), async (req, res, next) => {
  try {
    const { site, product, shipping } = req.validated;

    // ★ Composition Root: create adapter here, inject into service
    const adapter = createAdapter(site);
    const { requestId } = await executePurchase(adapter, { product, shipping });

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
