const Joi = require('joi');
const Fermentation = require('../models/fermentationModel');

const escapeRegex = (value = '') => String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const buildFermentationFilters = (query = {}) => {
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
      filters.stage = new RegExp(`^${escapeRegex(normalizedStage)}$`, "i");
    }
  }

  return filters;
};

const getFermentationsFiltered = async (req, res) => {
  try {
    const filters = buildFermentationFilters(req.query);
    const fermentations = await Fermentation.find(filters);
    res.json(fermentations);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Validation schema
const fermentationSchema = Joi.object({
  date: Joi.date().required(),
  plant: Joi.string().required(),
  product: Joi.string().required(),
  campaign: Joi.string().required(),
  tank: Joi.string().required(),
  stage: Joi.string().required(),
  levelIndicator: Joi.string().required(),
  weight: Joi.number().min(0).required(),
  receivedAmount: Joi.number().min(0).required()
});

// GET all
const getFermentations = async (req, res) => {
  try {
    let filters = {};

    if (req.user.role === 'operator') {
      filters = { createdBy: req.user.id };
    } else if (req.user.role === 'supervisor' || req.user.role === 'admin') {
      filters = {}; // See everything
    } else {
      filters = { approved: true }; // For frontend/public visibility
    }

    const fermentations = await Fermentation.find(filters);
    res.json(fermentations);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// GET by ID
const getFermentationById = async (req, res) => {
  try {
    const fermentation = await Fermentation.findById(req.params.id);
    if (!fermentation) return res.status(404).json({ message: 'Not found' });
    res.json(fermentation);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// POST new
const createFermentation = async (req, res) => {
  const { error, value } = fermentationSchema.validate(req.body);
  if (error) return res.status(400).json({ error: error.details[0].message });

  try {
    // Role-based creation logic
if (req.user.role === 'operator') {
  value.approved = false; // Operators’ entries need approval
} else {
  value.approved = true; // Supervisors/Admins auto-approved
}

value.createdBy = req.user.id; // Track who made it
    const fermentation = new Fermentation(value);
    const saved = await fermentation.save();
    res.status(201).json(saved);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

// PUT update
const updateFermentation = async (req, res) => {
  const { error, value } = fermentationSchema.validate(req.body);
  if (error) return res.status(400).json({ error: error.details[0].message });

  try {
    const fermentation = await Fermentation.findById(req.params.id);
    if (!fermentation) return res.status(404).json({ message: 'Not found' });

    // Operators: can only edit their own unapproved entries
    if (req.user.role === 'operator') {
      if (String(fermentation.createdBy) !== req.user.id) {
        return res.status(403).json({ message: 'Not authorized to edit this record' });
      }
      if (fermentation.approved) {
        return res.status(403).json({ message: 'Cannot edit approved records' });
      }
    }

    Object.assign(fermentation, value);
    const updated = await fermentation.save();
    res.json(updated);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const approveFermentation = async (req, res) => {
  try {
    const fermentation = await Fermentation.findById(req.params.id);
    if (!fermentation) return res.status(404).json({ message: 'Record not found' });

    fermentation.approved = true;
    await fermentation.save();

    res.json({ message: 'Fermentation record approved successfully', fermentation });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// DELETE
const deleteFermentation = async (req, res) => {
  try {
    const deleted = await Fermentation.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ message: 'Not found' });
    res.json({ message: 'Deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = {
  getFermentations,
  getFermentationsFiltered,
  getFermentationById,
  createFermentation,
  updateFermentation,
  deleteFermentation,
  approveFermentation
};




