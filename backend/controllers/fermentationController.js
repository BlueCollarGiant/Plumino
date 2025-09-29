const Joi = require('joi');
const Fermentation = require('../models/fermentationModel');

// Validation schema
const fermentationSchema = Joi.object({
  date: Joi.date().required(),
  plant: Joi.string().required(),
  product: Joi.string().required(),
  campaign: Joi.string().required(),
  tank: Joi.string().required(),
  stage: Joi.string().required(),
  levelIndicator: Joi.string().required()
});

// GET all
const getFermentations = async (req, res) => {
  try {
    const fermentations = await Fermentation.find();
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
    const updated = await Fermentation.findByIdAndUpdate(
      req.params.id,
      value,
      { new: true }
    );
    if (!updated) return res.status(404).json({ message: 'Not found' });
    res.json(updated);
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
  getFermentationById,
  createFermentation,
  updateFermentation,
  deleteFermentation
};
