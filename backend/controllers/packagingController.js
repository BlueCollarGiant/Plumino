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

const buildPackagingFilters = (query = {}) => {
  const { date, plant, product, campaign } = query;
  const filters = {};

  if (date) {
    const parsedDate = new Date(date);
    if (!Number.isNaN(parsedDate.getTime())) {
      const startOfDay = new Date(parsedDate);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(startOfDay);
      endOfDay.setDate(endOfDay.getDate() + 1);
      filters.date = { $gte: startOfDay, $lt: endOfDay }; // single-day window
    }
  }
  if (plant) filters.plant = plant;
  if (product) filters.product = product;
  if (campaign) filters.campaign = campaign;

  return filters;
};

// Controller: dynamically filter packaging records by optional query params
const getFilteredPackaging = async (req, res) => {
  const filters = buildPackagingFilters(req.query);

  try {
    const packagings = await Packaging.find(filters);
    res.json(packagings);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Aggregation: group packaging outgoing totals by plant
const getPackagingByPlant = async (req, res) => {
  const filters = buildPackagingFilters(req.query);
  try {
    const pipeline = [];
    if (Object.keys(filters).length > 0) {
      pipeline.push({ $match: filters });
    }
    pipeline.push(
      { $group: { _id: '$plant', total: { $sum: '$outgoingAmountKg' } } },
      { $sort: { total: -1 } }
    );

    const results = await Packaging.aggregate(pipeline);
    res.json(results);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Aggregation: group packaging outgoing totals by product
const getPackagingByProduct = async (req, res) => {
  const filters = buildPackagingFilters(req.query);
  try {
    const pipeline = [];
    if (Object.keys(filters).length > 0) {
      pipeline.push({ $match: filters });
    }
    pipeline.push(
      { $group: { _id: '$product', total: { $sum: '$outgoingAmountKg' } } },
      { $sort: { total: -1 } }
    );

    const results = await Packaging.aggregate(pipeline);
    res.json(results);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Aggregation: group packaging outgoing totals by campaign
const getPackagingByCampaign = async (req, res) => {
  const filters = buildPackagingFilters(req.query);
  try {
    const pipeline = [];
    if (Object.keys(filters).length > 0) {
      pipeline.push({ $match: filters });
    }
    pipeline.push(
      { $group: { _id: '$campaign', total: { $sum: '$outgoingAmountKg' } } },
      { $sort: { total: -1 } }
    );

    const results = await Packaging.aggregate(pipeline);
    res.json(results);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Aggregation: group packaging outgoing totals by date (day granularity)
const getPackagingByDate = async (req, res) => {
  const filters = buildPackagingFilters(req.query);
  try {
    const pipeline = [];
    if (Object.keys(filters).length > 0) {
      pipeline.push({ $match: filters });
    }
    pipeline.push(
      {
        $group: {
          _id: {
            $dateToString: { format: '%Y-%m-%d', date: '$date' }
          },
          total: { $sum: '$outgoingAmountKg' }
        }
      },
      { $sort: { _id: 1 } }
    );

    const results = await Packaging.aggregate(pipeline);
    res.json(results);
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
  getFilteredPackaging,
  getPackagingByPlant,
  getPackagingByProduct,
  getPackagingByCampaign,
  getPackagingByDate,
  getPackagingById,
  createPackaging,
  updatePackaging,
  deletePackaging
};
