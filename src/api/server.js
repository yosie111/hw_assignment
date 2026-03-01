// src/api/server.js
//
// Express application — single entry point for the entire backend.
//
// Middleware stack:
//   1. helmet — security headers
//   2. cors — allow React dev server (port 3000)
//   3. morgan — request logging
//   4. express.json — parse JSON bodies
//   5. API routes (/api/search, /api/purchase, /api/status)
//   6. Screenshots static serve (/api/screenshots)
//   7. React static files (production)
//   8. Global error handler (MUST be last)
//
// Architecture:
//   server.js → routes → services (never directly to automation/domain)

const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const helmet = require('helmet');
const path = require('path');

const searchRoutes = require('./routes/searchRoutes');
const purchaseRoutes = require('./routes/purchaseRoutes');
const statusRoutes = require('./routes/statusRoutes');
const { errorHandler } = require('./middleware/errorHandler');

const app = express();

// ─── Security + Logging ───
app.use(helmet());
app.use(cors());
app.use(morgan('dev'));
app.use(express.json());

// ─── Health Check ───
app.get('/', (req, res) => res.redirect('/api/health'));
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', uptime: process.uptime() });
});


// ─── API Routes ───
app.use('/api/search', searchRoutes);
app.use('/api/purchase', purchaseRoutes);
app.use('/api/status', statusRoutes);


// ─── Screenshots (static files from automation) ───
app.use('/api/screenshots', express.static(
  path.join(__dirname, '../../screenshots')
));

// ─── React static files (production build) ───
const clientBuild = path.join(__dirname, '../../client/build');
app.use(express.static(clientBuild));
app.get('/{*splat}', (req, res, next) => {
  // Only serve index.html for non-API routes (SPA fallback)
  if (req.path.startsWith('/api/')) return next();
  res.sendFile(path.join(clientBuild, 'index.html'), (err) => {
    if (err) next(); // client/build doesn't exist yet — skip
  });
});

// ─── Global Error Handler (must be last) ───
app.use(errorHandler);

// ─── Start Server (only when run directly, not when imported for tests) ───
if (require.main === module) {
  const startPort = parseInt(process.env.PORT, 10) || 8000;

  function startServer(port) {
    const server = app.listen(port);

    server.on('listening', () => {
      console.log(`Server running on http://localhost:${port}`);
      console.log(`API: http://localhost:${port}/api`);

      // Graceful shutdown — close connections, let running tasks finish
      const shutdown = (signal) => {
        console.log(`\n${signal} received. Shutting down...`);
        server.close(() => {
          console.log('Server closed.');
          process.exit(0);
        });
        setTimeout(() => {
          console.error('Forced shutdown after timeout.');
          process.exit(1);
        }, 10000).unref();
      };

      process.on('SIGTERM', () => shutdown('SIGTERM'));
      process.on('SIGINT', () => shutdown('SIGINT'));
    });

    server.on('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        console.log(`Port ${port} is busy, trying ${port + 1}...`);
        startServer(port + 1);
      } else {
        throw err;
      }
    });
  }

  startServer(startPort);
}

module.exports = app;
