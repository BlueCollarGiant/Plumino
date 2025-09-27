const mongoose = require('mongoose');

const fermentationSchema = new mongoose.Schema({
    tank: { type: String, required: true },
  stage: { type: String, required: true },
  levelIndicator: { type: String, required: true },
  product: { type: String, required: true },
  plant: { type: String, required: true },
  campaign: { type: String, required: true },
  received: { type: Number, required: true },       
  weight: { type: Number, required: true },          
  date: { type: Date, required: true },              
  createdAt: { type: Date, default: Date.now }

});

module.exports = mongoose.model('Fermentation', fermentationSchema);
