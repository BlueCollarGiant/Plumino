const Joi = require('joi');
const Fermentation = require('../models/fermentationModel');
const Employee = require('../models/employeeModel');

const PRIVILEGED_ROLES = new Set(['supervisor', 'hr', 'admin']);

// Role hierarchy: higher number = higher privilege
const ROLE_HIERARCHY = {
  'operator': 1,
  'supervisor': 2,
  'hr': 3,
  'admin': 4
};

const canEditRole = (userRole, targetRole) => {
  const userLevel = ROLE_HIERARCHY[userRole] || 0;
  const targetLevel = ROLE_HIERARCHY[targetRole] || 0;
  return userLevel >= targetLevel;
};

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
      filters.stage = new RegExp(`^${escapeRegex(normalizedStage)}$`, 'i');
    }
  }

  return filters;
};

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

const applyRoleFilters = (role, userId, baseFilters = {}) => {
  if (role === 'operator') {
    // Operators can see all records in their department
    // They can only EDIT their own pending records (enforced in ensureModifyPermission)
    return baseFilters;
  }
  return baseFilters;
};

const resolveCreatorInfo = async (createdBy) => {
  console.log('🔍 resolveCreatorInfo called with:', createdBy);
  
  if (!createdBy) {
    console.log('❌ No createdBy field');
    return null;
  }

  if (typeof createdBy === 'object' && createdBy !== null) {
    console.log('📦 CreatedBy is object:', createdBy);
    const id = createdBy._id ? createdBy._id.toString() : createdBy.toString?.();
    if (createdBy.role) {
      console.log('✅ Found role in object:', createdBy.role);
      return { id, role: createdBy.role };
    }
  }

  console.log('🔍 Looking up employee by ID:', createdBy);
  const creator = await Employee.findById(createdBy).select('_id role');
  console.log('👤 Employee lookup result:', creator);
  
  if (!creator) {
    console.log('❌ Employee not found');
    return null;
  }
  
  console.log('✅ Employee found:', { id: creator._id.toString(), role: creator.role });
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

  // Allow users to edit their own records regardless of status
  if (creatorId === userId) {
    return { allowed: true };
  }

  // For editing other users' records, can only modify operator-created records
  const creatorInfo = await resolveCreatorInfo(record.createdBy);
  if (!creatorInfo) {
    return { allowed: false, status: 404, message: 'Creator not found for this record.' };
  }

  // Check if user's role is high enough to edit the creator's role
  if (!canEditRole(user.role, creatorInfo.role)) {
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

const normalizeFermentation = (record) => {
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

const getFermentations = async (req, res) => {
  try {
    const filters = applyRoleFilters(req.user.role, req.user.id);
    const fermentations = await Fermentation.find(filters)
      .populate('createdBy', 'role name')
      .lean();
    res.json(fermentations.map(normalizeFermentation));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const getFermentationsFiltered = async (req, res) => {
  try {
    const baseFilters = buildFermentationFilters(req.query);
    const filters = applyRoleFilters(req.user.role, req.user.id, baseFilters);
    const fermentations = await Fermentation.find(filters)
      .populate('createdBy', 'role name')
      .lean();
    res.json(fermentations.map(normalizeFermentation));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const getFermentationById = async (req, res) => {
  try {
    const fermentation = await Fermentation.findById(req.params.id).populate('createdBy', 'role name');
    if (!fermentation) return res.status(404).json({ message: 'Not found' });

    const userId = String(req.user.id);
    const creator = fermentation.createdBy;
    const creatorId = creator
      ? creator._id
        ? creator._id.toString()
        : creator.toString?.()
      : null;
    if (req.user.role === 'operator' && creatorId !== userId) {
      return res.status(403).json({ message: 'You can only view your own records.' });
    }

    res.json(normalizeFermentation(fermentation));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const createFermentation = async (req, res) => {
  const { error, value } = fermentationSchema.validate(req.body);
  if (error) return res.status(400).json({ error: error.details[0].message });

  try {
    const fermentation = new Fermentation({
      ...value,
      status: 'pending',
      createdBy: req.user.id
    });
    const saved = await fermentation.save();
    res.status(201).json(saved);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

const updateFermentation = async (req, res) => {
  const { error, value } = fermentationSchema.validate(req.body);
  if (error) return res.status(400).json({ error: error.details[0].message });

  try {
    const fermentation = await Fermentation.findById(req.params.id);
    if (!fermentation) return res.status(404).json({ message: 'Not found' });

    const permission = await ensureModifyPermission(fermentation, req.user, 'edit');
    if (!permission.allowed) {
      return res.status(permission.status).json({ message: permission.message });
    }

    Object.assign(fermentation, value);
    const updated = await fermentation.save();
    res.json(updated);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const approveFermentation = async (req, res) => {
  console.log('🔥 approveFermentation called for ID:', req.params.id);
  try {
    console.log('🔍 Finding fermentation record...');
    const fermentation = await Fermentation.findById(req.params.id);
    console.log('📊 Found fermentation:', !!fermentation);
    
    if (!fermentation) {
      console.log('❌ Fermentation not found');
      return res.status(404).json({ message: 'Record not found' });
    }

    // Check if already approved (handle both status and approved fields)
    const isAlreadyApproved = fermentation.status === 'approved' || fermentation.approved === true;
    console.log('✅ Already approved check:', isAlreadyApproved);
    
    if (isAlreadyApproved) {
      await fermentation.populate('createdBy', 'role name');
      console.log('📤 Returning already approved record');
      return res.status(200).json({ message: 'Record already approved.', fermentation: normalizeFermentation(fermentation) });
    }

    console.log('🔐 Checking permissions...');
    const permission = await ensureApprovePermission(fermentation, req.user);
    console.log('🔐 Permission result:', permission);
    
    if (!permission.allowed) {
      console.log('❌ Permission denied');
      return res.status(permission.status).json({ message: permission.message });
    }

    // Set both fields for compatibility
    console.log('💾 Updating fermentation status...');
    fermentation.status = 'approved';
    fermentation.approved = true;
    await fermentation.save();
    await fermentation.populate('createdBy', 'role name');
    
    console.log('✅ Successfully approved fermentation record');
    res.json({ message: 'Fermentation record approved successfully', fermentation: normalizeFermentation(fermentation) });
  } catch (err) {
    console.error('💥 Error in approveFermentation:', err);
    res.status(500).json({ message: err.message });
  }
};

const deleteFermentation = async (req, res) => {
  try {
    const fermentation = await Fermentation.findById(req.params.id);
    if (!fermentation) return res.status(404).json({ message: 'Not found' });

    const permission = await ensureModifyPermission(fermentation, req.user, 'delete');
    if (!permission.allowed) {
      return res.status(permission.status).json({ message: permission.message });
    }

    await fermentation.deleteOne();
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
