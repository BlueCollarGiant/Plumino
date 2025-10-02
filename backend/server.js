const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const helmet = require('helmet');
require('dotenv').config();
const connectDB = require('./config/db.js');
connectDB();

const app = express();

// Middleware
app.use(express.json());
app.use(cors({ 
  origin: ['http://localhost:4200', 'http://localhost:4201'] 
})); // Angular dev server
app.use(morgan('dev'));
app.use(helmet());

// Health check endpoint with real database monitoring
app.get('/api/health', async (req, res) => {
  let databaseStatus = false;
  let databaseError = null;
  let responseTime = Date.now();
  
  try {
    // Test database connection with a simple query
    const mongoose = require('mongoose');
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

// Routes
const apiRoutes = require('./routes/api');
app.use('/api', apiRoutes);

const fermentationRoutes = require('./routes/fermentation');
app.use('/api', fermentationRoutes);

const packagingRoutes = require('./routes/packaging');
app.use('/api', packagingRoutes);

const extractionRoutes = require('./routes/extraction');
app.use('/api', extractionRoutes);



// Start Server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
