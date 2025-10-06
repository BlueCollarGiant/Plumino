require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bodyParser = require('body-parser');

const authRoutes = require('./routes/auth'); // login/register
const fermentationRoutes = require('./routes/fermentation');
const extractionRoutes = require('./routes/extraction');
const packagingRoutes = require('./routes/packaging');

const { authMiddleware } = require('./middleware/auth'); // make sure this exists!

const app = express();

// ---------- Middleware ----------
app.use(cors());
app.use(express.json());
app.use(bodyParser.urlencoded({ extended: false }));

// ---------- MongoDB Connection ----------
mongoose
  .connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log('✅ MongoDB connected'))
  .catch((err) => console.error('❌ MongoDB connection error:', err));

// ---------- Routes ----------

// Public routes (e.g. login, register)
app.use('/api/auth', authRoutes);

// Protected routes (all require authentication)
app.use('/api', authMiddleware, fermentationRoutes);
app.use('/api', authMiddleware, extractionRoutes);
app.use('/api', authMiddleware, packagingRoutes);

// ---------- Error Handling ----------
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Server Error', error: err.message });
});

// ---------- Server ----------
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
