const Joi = require('joi');
const Packaging = require('../models/packagingModel');

// Utility to build Mongo filters
const buildPackagingFilters = (query = {}) => {
  const { date, plant, product, campaign, packageType, range, startDate, endDate } = query;
  const filters = {};

  if (date) {
    const parsedDate = new Date(date);
    if (!Number.isNaN(parsedDate.getTime())) {
      const start = new Date(parsedDate);
      start.setHours(0, 0, 0, 0);
      const end = new Date(start);
      end.setDate(end.getDate() + 1);
      filters.date = { $gte: start, $lt: end };
    }
  }

  const applyDateBounds = (start, end) => {
    if (!filters.date) filters.date = {};
    if (start) filters.date.$gte = start;
    if (end) filters.date.$lt = end;
  };

  if (!filters.date && (startDate || endDate)) {
    const s = startDate ? new Date(startDate) : null;
    const e = endDate ? new Date(endDate) : null;
    if (s && !isNaN(s)) s.setHours(0, 0, 0, 0);
    if (e && !isNaN(e)) {
      const endDay = new Date(e);
      endDay.setHours(0, 0, 0, 0);
      endDay.setDate(endDay.getDate() + 1);
      applyDateBounds(s, endDay);
    } else if (s) applyDateBounds(s, null);
  }

  if (!filters.date && range) {
    const normalized = String(range).toLowerCase();
    const now = new Date();
    const end = new Date(now);
    end.setHours(0, 0, 0, 0);
    end.setDate(end.getDate() + 1);
    const start = new Date(end);
    switch (normalized) {
      case '7d': start.setDate(start.getDate() - 7); break;
      case '1m': start.setMonth(start.getMonth() - 1); break;
      case '6m': start.setMonth(start.getMonth() - 6); break;
      case '1y': start.setFullYear(start.getFullYear() - 1); break;
      default: break;
    }
    applyDateBounds(start, end);
  }

  if (plant) filters.plant = plant;
  if (product) filters.product = product;
  if (campaign) filters.campaign = campaign;
  if (packageType) filters.packageType = packageType;

  return filters;
};

// Validation schema
const packagingSchema = Joi.object({
  date: Joi.date().required(),
  plant: Joi.string().required(),
  product: Joi.string().required(),
  campaign: Joi.string().required(),
  packageType: Joi.string().required(),
  incomingAmountKg: Joi.number().positive().required(),
  outgoingAmountKg: Joi.number().positive().required(),
});

// ---------- CRUD + Approval Logic ----------

// GET all
const getPackagings = async (req, res) => {
  try {
    // Operators see only approved entries, supervisors/hr/admin see all
    const query = req.user.role === 'operator' ? { approved: true } : {};
    const packagings = await Packaging.find(query);
    res.json(packagings);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// GET filtered
const getFilteredPackaging = async (req, res) => {
  const filters = buildPackagingFilters(req.query);
  if (req.user.role === 'operator') filters.approved = true;

  try {
    const packagings = await Packaging.find(filters);
    res.json(packagings);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Aggregations (same logic, but filtered by role)
const aggregateWithRoleFilter = async (req, pipeline) => {
  const match = {};
  if (req.user.role === 'operator') match.approved = true;
  if (Object.keys(match).length) pipeline.unshift({ $match: match });
  return Packaging.aggregate(pipeline);
};

const getPackagingByPlant = async (req, res) => {
  try {
    const pipeline = [
      { $group: {
          _id: '$plant',
          outgoingTotal: { $sum: '$outgoingAmountKg' },
          incomingTotal: { $sum: '$incomingAmountKg' }
        } },
      { $sort: { outgoingTotal: -1 } }
    ];
    const results = await aggregateWithRoleFilter(req, pipeline);
    res.json(results);
  } catch (err) { res.status(500).json({ message: err.message }); }
};

const getPackagingByProduct = async (req, res) => {
  try {
    const pipeline = [
      { $group: {
          _id: '$product',
          outgoingTotal: { $sum: '$outgoingAmountKg' },
          incomingTotal: { $sum: '$incomingAmountKg' }
        } },
      { $sort: { outgoingTotal: -1 } }
    ];
    const results = await aggregateWithRoleFilter(req, pipeline);
    res.json(results);
  } catch (err) { res.status(500).json({ message: err.message }); }
};

const getPackagingByCampaign = async (req, res) => {
  try {
    const pipeline = [
      { $group: {
          _id: '$campaign',
          outgoingTotal: { $sum: '$outgoingAmountKg' },
          incomingTotal: { $sum: '$incomingAmountKg' }
        } },
      { $sort: { outgoingTotal: -1 } }
    ];
    const results = await aggregateWithRoleFilter(req, pipeline);
    res.json(results);
  } catch (err) { res.status(500).json({ message: err.message }); }
};

const getPackagingByDate = async (req, res) => {
  try {
    const pipeline = [
      { $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$date' } },
          outgoingTotal: { $sum: '$outgoingAmountKg' },
          incomingTotal: { $sum: '$incomingAmountKg' }
        } },
      { $sort: { _id: 1 } }
    ];
    const results = await aggregateWithRoleFilter(req, pipeline);
    res.json(results);
  } catch (err) { res.status(500).json({ message: err.message }); }
};

// GET by ID
const getPackagingById = async (req, res) => {
  try {
    const packaging = await Packaging.findById(req.params.id);
    if (!packaging) return res.status(404).json({ message: 'Not found' });
    if (req.user.role === 'operator' && !packaging.approved)
      return res.status(403).json({ message: 'Not approved yet' });
    res.json(packaging);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// CREATE
const createPackaging = async (req, res) => {
  const { error, value } = packagingSchema.validate(req.body);
  if (error) return res.status(400).json({ error: error.details[0].message });

  try {
    const packaging = new Packaging({
      ...value,
      createdBy: req.user.id,
      approved: req.user.role !== 'operator',
    });
    const saved = await packaging.save();
    res.status(201).json(saved);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

// UPDATE
const updatePackaging = async (req, res) => {
  const { error, value } = packagingSchema.validate(req.body);
  if (error) return res.status(400).json({ error: error.details[0].message });

  try {
    const packaging = await Packaging.findById(req.params.id);
    if (!packaging) return res.status(404).json({ message: 'Not found' });

    // Operators can only edit their own unapproved entries
    if (req.user.role === 'operator') {
      if (!packaging.createdBy || packaging.createdBy.toString() !== req.user.id) {
        return res.status(403).json({ message: 'You can only edit your own entries' });
      }
      if (packaging.approved) {
        return res.status(403).json({ message: 'Cannot edit approved entries' });
      }
    }

    Object.assign(packaging, value);
    const updated = await packaging.save();
    res.json(updated);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// APPROVE
const approvePackaging = async (req, res) => {
  try {
    const packaging = await Packaging.findById(req.params.id);
    if (!packaging) return res.status(404).json({ message: 'Not found' });
    packaging.approved = true;
    await packaging.save();
    res.json({ message: 'Packaging approved', packaging });
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
  approvePackaging,
  deletePackaging,
};
