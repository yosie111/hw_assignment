// src/api/routes/statusRoutes.js
//
// GET /api/status/:requestId — Real-time status polling
//
// Polled by UI every 2 seconds during purchase.
// Returns current step, accumulated steps[], and final result/error.
// Transforms screenshot file paths → URL paths for UI consumption.

const router = require('express').Router();
const statusStore = require('../../services/statusStore');

/**
 * GET /api/status/:requestId
 *
 * Response 200 (running):  { requestId, type, status, currentStep, steps[] }
 * Response 200 (completed): { ..., result: { order, screenshotUrls[] } }
 * Response 200 (failed):   { ..., error: "...", steps[] }
 * Response 404:            { error: "Request not found", requestId }
 */
router.get('/:requestId', (req, res) => {
  const { requestId } = req.params;
  const entry = statusStore.get(requestId);

  if (!entry) {
    return res.status(404).json({
      error: 'Request not found',
      requestId,
    });
  }

  // Build response — clone to avoid mutating store
  const response = { ...entry };

  // Transform screenshot file paths → URLs for UI
  if (response.result && response.result.screenshots) {
    response.result = {
      ...response.result,
      screenshotUrls: response.result.screenshots.map(filepath => {
        const filename = filepath.split(/[/\\]/).pop();
        return `/api/screenshots/${filename}`;
      }),
    };
  }

  res.json(response);
});

module.exports = router;
