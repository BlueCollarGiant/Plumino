// models/packagingModel.js
const mongoose = require('mongoose');

const packagingSchema = new mongoose.Schema({
  date: { type: Date, required: true },
  plant: { type: String, required: true },
  product: { type: String, required: true },
  campaign: { type: String, required: true },
  packageType: { type: String, required: true },     // maps from "package"
  incomingAmountKg: { type: Number, required: true }, // numeric kg
  outgoingAmountKg: { type: Number, required: true }, // numeric kg
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Packaging', packagingSchema);
