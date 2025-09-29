const Joi = require('joi');
const Extraction = require('../models/extractionModel');

const buildExtractionFilters = (query = {}) => {
  const { date, plant, product, campaign } = query;
  const filters = {};

  if (date) {
    const parsedDate = new Date(date);
    if (!Number.isNaN(parsedDate.getTime())) {
      const startOfDay = new Date(parsedDate);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(startOfDay);
      endOfDay.setDate(endOfDay.getDate() + 1);
      filters.date = { $gte: startOfDay, $lt: endOfDay };
    }
  }

  if (plant) filters.plant = plant;
  if (product) filters.product = product;
  if (campaign) filters.campaign = campaign;

  return filters;
};

// Joi validation schema
const extractionSchema = Joi.object({
  date: Joi.date().required(),
  plant: Joi.string().required(),
  product: Joi.string().required(),
  campaign: Joi.string().required(),
  stage: Joi.string().required(),
  tank: Joi.string().required(),
  concentration: Joi.number().positive().required(),
  volume: Joi.number().positive().required(),
  weight: Joi.number().positive().required(),
  levelIndicator: Joi.string().required(),
  pH: Joi.number().min(0).max(14).required()
});

// GET all
const getExtractions = async (req, res) => {
  try {
    const extractions = await Extraction.find();
    res.json(extractions);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const getExtractionsFiltered = async (req, res) => {
  const filters = buildExtractionFilters(req.query);

  try {
    const extractions = await Extraction.find(filters);
    res.json(extractions);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// GET by ID
const getExtractionById = async (req, res) => {
  try {
    const extraction = await Extraction.findById(req.params.id);
    if (!extraction) return res.status(404).json({ message: 'Not found' });
    res.json(extraction);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// POST new
const createExtraction = async (req, res) => {
  const { error, value } = extractionSchema.validate(req.body);
  if (error) return res.status(400).json({ error: error.details[0].message });

  try {
    const extraction = new Extraction(value);
    const saved = await extraction.save();
    res.status(201).json(saved);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

// PUT update
const updateExtraction = async (req, res) => {
  const { error, value } = extractionSchema.validate(req.body);
  if (error) return res.status(400).json({ error: error.details[0].message });

  try {
    const updated = await Extraction.findByIdAndUpdate(req.params.id, value, { new: true });
    if (!updated) return res.status(404).json({ message: 'Not found' });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// DELETE
const deleteExtraction = async (req, res) => {
  try {
    const deleted = await Extraction.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ message: 'Not found' });
    res.json({ message: 'Deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = {
  getExtractions,
  getExtractionsFiltered,
  getExtractionById,
  createExtraction,
  updateExtraction,
  deleteExtraction
};
