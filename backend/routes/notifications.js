const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/auth');
const { sseManager } = require('../services/sseManager');

// SSE endpoint for real-time notifications
router.get('/notifications', authMiddleware, (req, res) => {
  // Set SSE headers
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': 'http://localhost:4200',
    'Access-Control-Allow-Credentials': 'true',
    'Access-Control-Allow-Headers': 'Authorization'
  });

  // Send initial connection confirmation
  res.write(`event: connected\n`);
  res.write(`data: ${JSON.stringify({ message: 'SSE connection established', timestamp: new Date().toISOString() })}\n\n`);

  // Add this connection to the SSE manager
  sseManager.addConnection(req.user.id, res);

  // Send periodic heartbeat to keep connection alive
  const heartbeat = setInterval(() => {
    if (!res.destroyed) {
      res.write(`event: heartbeat\n`);
      res.write(`data: ${JSON.stringify({ timestamp: new Date().toISOString() })}\n\n`);
    } else {
      clearInterval(heartbeat);
    }
  }, 30000); // Every 30 seconds

  // Clean up on disconnect
  req.on('close', () => {
    clearInterval(heartbeat);
    sseManager.connections.delete(req.user.id);
  });
});

module.exports = router;