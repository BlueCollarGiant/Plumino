// config/db.js
const mongoose = require('mongoose');

const connectDB = async () => {
  // Render loads MONGO_URI from the Environment tab. No localhost fallback.
  const MONGO_URI = process.env.MONGO_URI;

  if (!MONGO_URI) {
    console.error('❌ Missing MONGO_URI environment variable. Define it in Render or .env');
    process.exit(1);
  }

  try {
    const conn = await mongoose.connect(MONGO_URI);
    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`❌ MongoDB connection error: ${error.message}`);
    process.exit(1);
  }
};

module.exports = connectDB;
