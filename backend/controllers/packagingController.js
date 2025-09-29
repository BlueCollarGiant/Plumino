const Joi = require('joi');
const Packaging = require('../models/packagingModel');

// Joi validation schema
const packagingSchema = Joi.object({
  date: Joi.date().required(),
  plant: Joi.string().required(),
  product: Joi.string().required(),
  campaign: Joi.string().required(),
  package: Joi.string().required(),
  incomingAmount: Joi.number().positive().required(),
  outgoingAmount: Joi.number().positive().required()
});

// GET all
const getPackagings = async (req, res) => {
  try {
    const packagings = await Packaging.find();
    res.json(packagings);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// GET by ID
const getPackagingById = async (req, res) => {
  try {
    const packaging = await Packaging.findById(req.params.id);
    if (!packaging) return res.status(404).json({ message: 'Not found' });
    res.json(packaging);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// POST new
const createPackaging = async (req, res) => {
  const { error, value } = packagingSchema.validate(req.body);
  if (error) return res.status(400).json({ error: error.details[0].message });

  try {
    const packaging = new Packaging(value);
    const saved = await packaging.save();
    res.status(201).json(saved);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

// PUT update
const updatePackaging = async (req, res) => {
  const { error, value } = packagingSchema.validate(req.body);
  if (error) return res.status(400).json({ error: error.details[0].message });

  try {
    const updated = await Packaging.findByIdAndUpdate(req.params.id, value, { new: true });
    if (!updated) return res.status(404).json({ message: 'Not found' });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// DELETE
const deletePackaging = async (req, res) => {
  try {
    const deleted = await Packaging.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ message: 'Not found' });
    res.json({ message: 'Deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = {
  getPackagings,
  getPackagingById,
  createPackaging,
  updatePackaging,
  deletePackaging
};
