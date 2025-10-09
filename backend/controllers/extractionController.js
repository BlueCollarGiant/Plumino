const Joi = require('joi');
const Extraction = require('../models/extractionModel');
const Employee = require('../models/employeeModel');

const PRIVILEGED_ROLES = new Set(['supervisor', 'hr', 'admin']);

const escapeRegex = (value = '') => String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

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

const applyRoleFilters = (role, userId, baseFilters = {}) => {
  if (role === 'operator') {
    // Allow operators to see records they created OR legacy seeded data without createdBy
    return { 
      ...baseFilters, 
      $or: [
        { createdBy: userId },
        { createdBy: { $exists: false } },
        { createdBy: null }
      ]
    };
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

  // Supervisors and higher can approve any pending record, regardless of creator details.
  // Creator information may be missing on seeded or legacy data, so no further checks occur here.
  return { allowed: true };
};

const toPlainObject = (document) => {
  if (!document) return null;
  if (typeof document.toObject === 'function') {
    return document.toObject();
  }
  return { ...document };
};

const normalizeExtraction = (record) => {
  if (!record) return null;
  const plain = toPlainObject(record);
  const normalized = { ...plain };

  if (plain._id) {
    normalized._id = plain._id.toString();
  }

  // Handle both status field and legacy approved field
  if (plain.approved === true) {
    normalized.status = 'approved';
  } else if (plain.status) {
    normalized.status = plain.status;
  } else {
    normalized.status = 'pending';
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

const getExtractions = async (req, res) => {
  try {
    const filters = applyRoleFilters(req.user.role, req.user.id);
    const extractions = await Extraction.find(filters)
      .populate('createdBy', 'role name')
      .lean();
    res.json(extractions.map(normalizeExtraction));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const getExtractionsFiltered = async (req, res) => {
  const baseFilters = buildExtractionFilters(req.query);
  const filters = applyRoleFilters(req.user.role, req.user.id, baseFilters);

  try {
    const extractions = await Extraction.find(filters)
      .populate('createdBy', 'role name')
      .lean();
    res.json(extractions.map(normalizeExtraction));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const getExtractionById = async (req, res) => {
  try {
    const extraction = await Extraction.findById(req.params.id).populate('createdBy', 'role name');
    if (!extraction) return res.status(404).json({ message: 'Not found' });

    const userId = String(req.user.id);
    const creator = extraction.createdBy;
    const creatorId = creator
      ? creator._id
        ? creator._id.toString()
        : creator.toString?.()
      : null;
    if (req.user.role === 'operator' && creatorId !== userId) {
      return res.status(403).json({ message: 'You can only view your own records.' });
    }

    res.json(normalizeExtraction(extraction));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const createExtraction = async (req, res) => {
  const { error, value } = extractionSchema.validate(req.body);
  if (error) return res.status(400).json({ error: error.details[0].message });

  try {
    const extraction = new Extraction({
      ...value,
      status: 'pending',
      createdBy: req.user.id
    });
    const saved = await extraction.save();
    res.status(201).json(saved);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

const updateExtraction = async (req, res) => {
  const { error, value } = extractionSchema.validate(req.body);
  if (error) return res.status(400).json({ error: error.details[0].message });

  try {
    const extraction = await Extraction.findById(req.params.id);
    if (!extraction) return res.status(404).json({ message: 'Not found' });

    const permission = await ensureModifyPermission(extraction, req.user, 'edit');
    if (!permission.allowed) {
      return res.status(permission.status).json({ message: permission.message });
    }

    Object.assign(extraction, value);
    const updated = await extraction.save();
    res.json(updated);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const approveExtraction = async (req, res) => {
  try {
    const extraction = await Extraction.findById(req.params.id);
    if (!extraction) return res.status(404).json({ message: 'Not found' });

    // Check if already approved (handle both status and approved fields)
    const isAlreadyApproved = extraction.status === 'approved' || extraction.approved === true;
    if (isAlreadyApproved) {
      return res.status(200).json({ message: 'Record already approved.', extraction: normalizeExtraction(extraction) });
    }

    const permission = await ensureApprovePermission(extraction, req.user);
    if (!permission.allowed) {
      return res.status(permission.status).json({ message: permission.message });
    }

    // Set both fields for compatibility
    extraction.status = 'approved';
    extraction.approved = true;
    await extraction.save();

    res.json({ message: 'Extraction approved', extraction: normalizeExtraction(extraction) });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const deleteExtraction = async (req, res) => {
  try {
    const extraction = await Extraction.findById(req.params.id);
    if (!extraction) return res.status(404).json({ message: 'Not found' });

    const permission = await ensureModifyPermission(extraction, req.user, 'delete');
    if (!permission.allowed) {
      return res.status(permission.status).json({ message: permission.message });
    }

    await extraction.deleteOne();
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
  deleteExtraction
};
