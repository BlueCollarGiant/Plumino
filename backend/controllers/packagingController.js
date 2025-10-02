const Joi = require('joi');
const Packaging = require('../models/packagingModel');

const buildPackagingFilters = (query = {}) => {
  const { date, plant, product, campaign, packageType, range, startDate, endDate } = query;
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

  const applyDateBounds = (start, end) => {
    if (!filters.date) filters.date = {};
    if (start) filters.date.$gte = start;
    if (end) filters.date.$lt = end;
  };

  if (!filters.date && (startDate || endDate)) {
    const startParsed = startDate ? new Date(startDate) : null;
    const endParsed = endDate ? new Date(endDate) : null;

    if (startParsed && !Number.isNaN(startParsed.getTime())) {
      startParsed.setHours(0, 0, 0, 0);
    }
    if (endParsed && !Number.isNaN(endParsed.getTime())) {
      const endOfDay = new Date(endParsed);
      endOfDay.setHours(0, 0, 0, 0);
      endOfDay.setDate(endOfDay.getDate() + 1);
      applyDateBounds(startParsed, endOfDay);
    } else if (startParsed) {
      applyDateBounds(startParsed, null);
    }
  }

  if (!filters.date && range) {
    const normalized = String(range).toLowerCase();
    const now = new Date();
    const end = new Date(now);
    end.setHours(0, 0, 0, 0);
    end.setDate(end.getDate() + 1);

    const start = new Date(end);

    switch (normalized) {
      case '7d':
        start.setDate(start.getDate() - 7);
        applyDateBounds(start, end);
        break;
      case '1m':
        start.setMonth(start.getMonth() - 1);
        applyDateBounds(start, end);
        break;
      case '6m':
        start.setMonth(start.getMonth() - 6);
        applyDateBounds(start, end);
        break;
      case '1y':
        start.setFullYear(start.getFullYear() - 1);
        applyDateBounds(start, end);
        break;
      default:
        break;
    }
  }

  if (plant) filters.plant = plant;
  if (product) filters.product = product;
  if (campaign) filters.campaign = campaign;
  if (packageType) filters.packageType = packageType;

  return filters;
};

// Joi validation schema
const packagingSchema = Joi.object({
  date: Joi.date().required(),
  plant: Joi.string().required(),
  product: Joi.string().required(),
  campaign: Joi.string().required(),
  packageType: Joi.string().required(),
  incomingAmountKg: Joi.number().positive().required(),
  outgoingAmountKg: Joi.number().positive().required()
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

// Aggregation: group packaging totals by plant
const getPackagingByPlant = async (req, res) => {
  const filters = buildPackagingFilters(req.query);
  try {
    const pipeline = [];
    if (Object.keys(filters).length > 0) {
      pipeline.push({ $match: filters });
    }
    pipeline.push(
      {
        $group: {
          _id: '$plant',
          outgoingTotal: { $sum: '$outgoingAmountKg' },
          incomingTotal: { $sum: '$incomingAmountKg' }
        }
      },
      { $sort: { outgoingTotal: -1 } }
    );

    const results = await Packaging.aggregate(pipeline);
    res.json(results);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Aggregation: group packaging totals by product
const getPackagingByProduct = async (req, res) => {
  const filters = buildPackagingFilters(req.query);
  try {
    const pipeline = [];
    if (Object.keys(filters).length > 0) {
      pipeline.push({ $match: filters });
    }
    pipeline.push(
      {
        $group: {
          _id: '$product',
          outgoingTotal: { $sum: '$outgoingAmountKg' },
          incomingTotal: { $sum: '$incomingAmountKg' }
        }
      },
      { $sort: { outgoingTotal: -1 } }
    );

    const results = await Packaging.aggregate(pipeline);
    res.json(results);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Aggregation: group packaging totals by campaign
const getPackagingByCampaign = async (req, res) => {
  const filters = buildPackagingFilters(req.query);
  try {
    const pipeline = [];
    if (Object.keys(filters).length > 0) {
      pipeline.push({ $match: filters });
    }
    const hasSpecificCampaign = typeof filters.campaign === 'string';

    if (hasSpecificCampaign) {
      pipeline.push(
        {
          $group: {
            _id: {
              campaign: '$campaign',
              date: { $dateToString: { format: '%Y-%m-%d', date: '$date' } }
            },
            outgoingTotal: { $sum: '$outgoingAmountKg' },
            incomingTotal: { $sum: '$incomingAmountKg' }
          }
        },
        { $sort: { '_id.date': 1 } }
      );
    } else {
      pipeline.push(
        {
          $group: {
            _id: '$campaign',
            outgoingTotal: { $sum: '$outgoingAmountKg' },
            incomingTotal: { $sum: '$incomingAmountKg' }
          }
        },
        { $sort: { outgoingTotal: -1 } }
      );
    }

    const results = await Packaging.aggregate(pipeline);
    res.json(results);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Aggregation: group packaging totals by date (day granularity)
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
          outgoingTotal: { $sum: '$outgoingAmountKg' },
          incomingTotal: { $sum: '$incomingAmountKg' }
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

