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
app.use(cors({ origin: 'http://localhost:4200' })); // Angular dev server
app.use(morgan('dev'));
app.use(helmet());

// Routes
const apiRoutes = require('./routes/api');
app.use('/api', apiRoutes);

const fermentationRoutes = require('./routes/fermentation');
app.use('/api', fermentationRoutes);

// Start Server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
