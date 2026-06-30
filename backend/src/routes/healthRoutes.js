/**
 * healthRoutes.js
 *
 * Provides a lightweight, unauthenticated health-check endpoint for PunchUp.
 *
 * Route:  GET /health
 *
 * Purpose:
 *   - Allows external uptime monitors (e.g. UptimeRobot, Better Stack) to
 *     verify that the Express process is alive and accepting connections.
 *   - Intentionally avoids any database queries or external service calls so
 *     the response is near-instantaneous and cannot be blocked by DB downtime.
 *   - No authentication middleware is applied to this router, keeping the
 *     endpoint publicly accessible at all times.
 *
 * Response shape (HTTP 200):
 *   {
 *     "success": true,
 *     "status": "healthy",
 *     "service": "PunchUp Backend",
 *     "timestamp": "<ISO 8601 string>"
 *   }
 */

const express = require('express');
const router = express.Router();

/**
 * GET /health
 *
 * Confirms the Express application is running.
 * No DB access, no auth — pure in-process response.
 */
router.get('/', (req, res) => {
  res.status(200).json({
    success: true,
    status: 'healthy',
    service: 'PunchUp Backend',
    timestamp: new Date().toISOString()
  });
});

module.exports = router;
