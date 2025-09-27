const Joi = require('joi');
const Fermentation = require('../models/fermentationModel');

// Joi validation schema
const fermentationSchema = Joi.object({
    tank: Joi.string().required(),
    stage: Joi.string().required(),
    levelIndicator: Joi.string().required(),
    product: Joi.string().required(),
    plant: Joi.string().required(),
    campaign: Joi.string().required(),
    received: Joi.number().positive().required(),
    weight: Joi.number().positive().required(),
    date: Joi.date().required()
});

// GET /fermentation (list all records)
const getFermentations = async (req, res) => {
  try {
    const fermentations = await Fermentation.find();
    res.json(fermentations);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// POST /fermentation (add new record)
const createFermentation = async (req, res) => {
  const { error, value } = fermentationSchema.validate(req.body);
  if (error) {
    return res.status(400).json({ error: error.details[0].message });
  }

  try {
    const fermentation = new Fermentation(value);
    const saved = await fermentation.save();
    res.status(201).json(saved);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

module.exports = { getFermentations, createFermentation };
