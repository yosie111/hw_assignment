// src/api/routes/purchaseRoutes.js
//
// POST /api/purchase — Asynchronous (Fire & Forget)
//
// Flow: validate → executePurchase() → 202 Accepted { requestId }
// Automation runs in background. UI polls GET /api/status/:requestId.

const router = require('express').Router();
const { executePurchase } = require('../../services/purchaseService');
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
    const { requestId } = await executePurchase({ site, product, shipping, buyerIp: req.ip });

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
