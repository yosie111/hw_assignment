// src/api/middleware/errorHandler.js
//
// Global Express error handler — must be registered LAST.
//
// Design:
//   - Catches all unhandled errors from route handlers (via next(error))
//   - Returns structured JSON: { error, stack? }
//   - Stack trace only in development (never in production)
//   - Logs with requestId when available for correlation

/**
 * Global error handler middleware.
 * Express recognizes it by the 4-parameter signature (err, req, res, _next).
 */
function errorHandler(err, req, res, _next) {
  const status = err.status || 500;
  const message = err.message || 'Internal server error';

  console.error(`[ERROR] ${req.method} ${req.path}:`, {
    status,
    message,
    ...(process.env.NODE_ENV !== 'production' && { stack: err.stack }),
  });

  res.status(status).json({
    error: message,
    ...(process.env.NODE_ENV !== 'production' && { stack: err.stack }),
  });
}

module.exports = { errorHandler };
