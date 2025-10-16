require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bodyParser = require('body-parser');

const authRoutes = require('./routes/auth'); // login/register
const apiRoutes = require('./routes/api'); // employee management
const notificationRoutes = require('./routes/notifications'); // SSE notifications
const fermentationRoutes = require('./routes/fermentation');
const extractionRoutes = require('./routes/extraction');
const packagingRoutes = require('./routes/packaging');

// Initialize services
const { sseManager } = require('./services/sseManager');
const { autoLogoutManager } = require('./services/autoLogoutManager');

const { authMiddleware } = require('./middleware/auth'); // global auth middleware

const app = express();

// ---------- Middleware ----------
app.use(cors());
app.use(express.json());
app.use(bodyParser.urlencoded({ extended: false }));

// Add request logging middleware
app.use((req, res, next) => {
  console.log(`📝 ${req.method} ${req.url} - ${new Date().toISOString()}`);
  next();
});

// ---------- MongoDB Connection ----------
// Render loads MONGO_URI from the Environment tab. No localhost fallback.
const MONGO_URI = process.env.MONGO_URI;
if (!MONGO_URI) {
  console.error('❌ Missing MONGO_URI environment variable. Define it in Render or .env');
  process.exit(1);
}

mongoose
  .connect(MONGO_URI)
  .then(() => console.log('✅ MongoDB connected'))
  .catch((err) => {
    console.error('❌ MongoDB connection error:', err);
    process.exit(1);
  });

// ---------- Routes ----------

// Health check endpoint (public - no auth required)
app.get('/api/health', async (req, res) => {
  let databaseStatus = false;
  let databaseError = null;
  let responseTime = Date.now();

  try {
    // Test database connection with a simple query
    if (mongoose.connection.readyState === 1) {
      // Test with a simple ping to verify DB is responsive
      await mongoose.connection.db.admin().ping();
      databaseStatus = true;
    }
  } catch (error) {
    databaseError = error.message;
    console.warn('Database health check failed:', error.message);
  }

  responseTime = Date.now() - responseTime;

  const healthData = {
    status: databaseStatus ? 'healthy' : 'degraded',
    timestamp: new Date().toISOString(),
    backend: true, // If we're responding, backend is up
    database: databaseStatus,
    uptime: process.uptime(),
    version: '1.0.0',
    responseTime: responseTime,
    databaseError: databaseError,
    connections: {
      database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected'
    }
  };

  // Return appropriate HTTP status
  const statusCode = databaseStatus ? 200 : 503;
  res.status(statusCode).json(healthData);
});

// Public routes (e.g. login, register)
app.use('/api/auth', authRoutes);

// Protected routes (all require authentication)
app.use('/api', authMiddleware, apiRoutes);
app.use('/api/sse', notificationRoutes); // SSE notifications
app.use('/api', authMiddleware, fermentationRoutes);
app.use('/api', authMiddleware, extractionRoutes);
app.use('/api', authMiddleware, packagingRoutes);

// ---------- Error Handling ----------
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Server Error', error: err.message });
});

// ---------- Server ----------
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));


