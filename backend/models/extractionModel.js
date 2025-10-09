const mongoose = require('mongoose');

const extractionSchema = new mongoose.Schema({
  date: { type: Date, required: true },
  plant: { type: String, required: true },
  product: { type: String, required: true },
  campaign: { type: String, required: true },
  stage: { type: String, required: true },
  tank: { type: String, required: true },
  concentration: { type: Number, required: true }, // g/L
  volume: { type: Number, required: true },        // gallons
  weight: { type: Number, required: true },        // kg
  levelIndicator: { type: String, required: true },
  pH: { type: Number, required: true },
  status: { type: String, enum: ['pending', 'approved'], default: 'pending' },
  approved: { type: Boolean, default: false }, // Legacy field for existing data
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee' }, // Not required for legacy data
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Extraction', extractionSchema);
