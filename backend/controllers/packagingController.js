const Joi = require('joi');
const mongoose = require('mongoose');
const Packaging = require('../models/packagingModel');
const Employee = require('../models/employeeModel');

const PRIVILEGED_ROLES = new Set(['supervisor', 'hr', 'admin']);

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

const applyRoleFilters = (role, userId, baseFilters = {}) => {
  if (role === 'operator') {
    return { ...baseFilters, createdBy: userId };
  }
  return baseFilters;
};

const resolveCreatorInfo = async (createdBy) => {
  if (!createdBy) return null;

  if (typeof createdBy === 'object' && createdBy !== null) {
    const id = createdBy._id ? createdBy._id.toString() : createdBy.toString?.();
    if (createdBy.role) {
      return { id, role: createdBy.role };
    }
  }

  const creator = await Employee.findById(createdBy).select('_id role');
  if (!creator) return null;
  return { id: creator._id.toString(), role: creator.role };
};

const ensureModifyPermission = async (record, user, actionLabel) => {
  const userId = String(user.id);
  const creatorId = record.createdBy ? record.createdBy.toString() : null;

  if (user.role === 'operator') {
    if (!creatorId || creatorId !== userId) {
      return { allowed: false, status: 403, message: 'You can only modify your own records while pending.' };
    }
    if (record.status !== 'pending') {
      return { allowed: false, status: 403, message: `Cannot ${actionLabel} records that are already approved.` };
    }
    return { allowed: true };
  }

  if (!PRIVILEGED_ROLES.has(user.role)) {
    return { allowed: false, status: 403, message: 'Access denied: insufficient permissions.' };
  }

  if (!creatorId) {
    return { allowed: false, status: 400, message: 'Record does not have a creator associated.' };
  }

  if (creatorId === userId) {
    return { allowed: true };
  }

  const creatorInfo = await resolveCreatorInfo(record.createdBy);
  if (!creatorInfo) {
    return { allowed: false, status: 404, message: 'Creator not found for this record.' };
  }

  if (creatorInfo.role !== 'operator') {
    return {
      allowed: false,
      status: 403,
      message: `Cannot ${actionLabel} records submitted by ${creatorInfo.role} personnel.`
    };
  }

  return { allowed: true };
};

const ensureApprovePermission = async (record, user) => {
  if (!PRIVILEGED_ROLES.has(user.role)) {
    return { allowed: false, status: 403, message: 'Only supervisors, HR, or admins can approve records.' };
  }

  const creatorInfo = await resolveCreatorInfo(record.createdBy);
  if (!creatorInfo) {
    return { allowed: false, status: 404, message: 'Creator not found for this record.' };
  }

  if (creatorInfo.role !== 'operator') {
    return {
      allowed: false,
      status: 403,
      message: 'Only records submitted by operators can be approved.'
    };
  }

  return { allowed: true };
};

const toPlainObject = (document) => {
  if (!document) return null;
  if (typeof document.toObject === 'function') {
    return document.toObject();
  }
  return { ...document };
};

const normalizePackaging = (record) => {
  if (!record) return null;
  const plain = toPlainObject(record);
  const normalized = { ...plain };

  if (plain._id) {
    normalized._id = plain._id.toString();
  }

  const creator = plain.createdBy;
  if (creator && typeof creator === 'object' && creator !== null) {
    const creatorId = creator._id ? creator._id.toString() : creator.toString?.();
    normalized.createdBy = creatorId || null;
    normalized.createdByRole = creator.role || null;
    normalized.createdByName = creator.name || null;
  } else if (creator) {
    normalized.createdBy = creator.toString();
    normalized.createdByRole = null;
    normalized.createdByName = null;
  } else {
    normalized.createdBy = null;
    normalized.createdByRole = null;
    normalized.createdByName = null;
  }

  return normalized;
};

const toObjectId = (value) => {
  if (!value) return null;
  if (value instanceof mongoose.Types.ObjectId) return value;
  return mongoose.Types.ObjectId.isValid(value) ? new mongoose.Types.ObjectId(value) : null;
};

// ---------- CRUD + Approval Logic ----------

// GET all
const getPackagings = async (req, res) => {
  try {
    const filters = applyRoleFilters(req.user.role, req.user.id);
    const packagings = await Packaging.find(filters)
      .populate('createdBy', 'role name')
      .lean();
    res.json(packagings.map(normalizePackaging));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// GET filtered
const getFilteredPackaging = async (req, res) => {
  const baseFilters = buildPackagingFilters(req.query);
  const filters = applyRoleFilters(req.user.role, req.user.id, baseFilters);

  try {
    const packagings = await Packaging.find(filters)
      .populate('createdBy', 'role name')
      .lean();
    res.json(packagings.map(normalizePackaging));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Aggregations (same logic, but filtered by role)
const aggregateWithRoleFilter = async (req, pipeline) => {
  const workingPipeline = [...pipeline];

  if (req.user.role === 'operator') {
    const operatorId = toObjectId(req.user.id);
    if (!operatorId) {
      return [];
    }
    workingPipeline.unshift({ $match: { createdBy: operatorId } });
  }

  return Packaging.aggregate(workingPipeline);
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
    const packaging = await Packaging.findById(req.params.id).populate('createdBy', 'role name');
    if (!packaging) return res.status(404).json({ message: 'Not found' });

    const userId = String(req.user.id);
    const creator = packaging.createdBy;
    const creatorId = creator
      ? creator._id
        ? creator._id.toString()
        : creator.toString?.()
      : null;
    if (req.user.role === 'operator' && creatorId !== userId) {
      return res.status(403).json({ message: 'You can only view your own records.' });
    }

    res.json(normalizePackaging(packaging));
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
      status: 'pending',
      createdBy: req.user.id,
    });
    const saved = await packaging.save();
    await saved.populate('createdBy', 'role name');
    res.status(201).json(normalizePackaging(saved));
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

    const permission = await ensureModifyPermission(packaging, req.user, 'edit');
    if (!permission.allowed) {
      return res.status(permission.status).json({ message: permission.message });
    }

    Object.assign(packaging, value);
    const updated = await packaging.save();
    await updated.populate('createdBy', 'role name');
    res.json(normalizePackaging(updated));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// APPROVE
const approvePackaging = async (req, res) => {
  try {
    const packaging = await Packaging.findById(req.params.id);
    if (!packaging) return res.status(404).json({ message: 'Not found' });

    if (packaging.status === 'approved') {
      await packaging.populate('createdBy', 'role name');
      return res.status(200).json({ message: 'Record already approved.', packaging: normalizePackaging(packaging) });
    }

    const permission = await ensureApprovePermission(packaging, req.user);
    if (!permission.allowed) {
      return res.status(permission.status).json({ message: permission.message });
    }

    packaging.status = 'approved';
    await packaging.save();
    await packaging.populate('createdBy', 'role name');
    res.json({ message: 'Packaging record approved successfully', packaging: normalizePackaging(packaging) });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// DELETE
const deletePackaging = async (req, res) => {
  try {
    const packaging = await Packaging.findById(req.params.id);
    if (!packaging) return res.status(404).json({ message: 'Not found' });

    const permission = await ensureModifyPermission(packaging, req.user, 'delete');
    if (!permission.allowed) {
      return res.status(permission.status).json({ message: permission.message });
    }

    await packaging.deleteOne();
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
