const Joi = require('joi');
const Extraction = require('../models/extractionModel');

const escapeRegex = (value = '') => String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// Filter builder
const buildExtractionFilters = (query = {}) => {
  const { date, plant, product, campaign, stage } = query;
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
  if (stage) {
    const normalizedStage = String(stage).trim();
    if (normalizedStage) {
      filters.stage = new RegExp(`^${escapeRegex(normalizedStage)}$`, 'i');
    }
  }

  return filters;
};

// Validation schema
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
  pH: Joi.number().min(0).max(14).required(),
});

// GET all — operators see only approved
const getExtractions = async (req, res) => {
  try {
    const query = req.user.role === 'operator' ? { approved: true } : {};
    const extractions = await Extraction.find(query);
    res.json(extractions);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// GET filtered
const getExtractionsFiltered = async (req, res) => {
  const filters = buildExtractionFilters(req.query);
  if (req.user.role === 'operator') filters.approved = true;

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

    if (req.user.role === 'operator' && !extraction.approved) {
      return res.status(403).json({ message: 'Not approved yet' });
    }

    res.json(extraction);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// CREATE — operator’s entries auto-set as unapproved
const createExtraction = async (req, res) => {
  const { error, value } = extractionSchema.validate(req.body);
  if (error) return res.status(400).json({ error: error.details[0].message });

  try {
    const extraction = new Extraction({
      ...value,
      status: 'pending',
      createdBy: req.user._id,
    });
    const saved = await extraction.save();
    res.status(201).json(saved);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

// UPDATE — operators can only edit their own unapproved entries
const updateExtraction = async (req, res) => {
  const { error, value } = extractionSchema.validate(req.body);
  if (error) return res.status(400).json({ error: error.details[0].message });

  try {
    const extraction = await Extraction.findById(req.params.id);
    if (!extraction) return res.status(404).json({ message: 'Not found' });

    // Operators can only edit their own pending entries
    if (req.user.role === 'operator') {
      if (!extraction.createdBy || extraction.createdBy.toString() !== req.user._id) {
        return res.status(403).json({ message: 'You can only edit your own entries' });
      }
      if (extraction.status === 'approved') {
        return res.status(403).json({ message: 'Cannot edit approved entries' });
      }
    }

    Object.assign(extraction, value);
    const updated = await extraction.save();
    res.json(updated);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// APPROVE — supervisor/admin
const approveExtraction = async (req, res) => {
  try {
    const extraction = await Extraction.findById(req.params.id);
    if (!extraction) return res.status(404).json({ message: 'Not found' });

    extraction.status = 'approved';
    await extraction.save();

    res.json({ message: 'Extraction approved', extraction });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// DELETE — supervisor/admin only
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
  approveExtraction,
  deleteExtraction,
};
