const express = require('express');
const router = express.Router();

const {
  getFermentations,
  getFermentationsFiltered,
  getFermentationById,
  createFermentation,
  updateFermentation,
  deleteFermentation,
  approveFermentation
} = require('../controllers/fermentationController');

const { authMiddleware } = require('../middleware/auth');
const roleAuth = require('../middleware/roleAuth');
const { departmentAuth } = require('../middleware/departmentAuth');

// GET all (frontend only sees approved ones) - fermentation dept only
router.get('/fermentation', authMiddleware, departmentAuth('fermentation'), getFermentations);

// GET filtered fermentations (employees see only approved) - fermentation dept only
router.get(
    '/fermentation/filter',
    authMiddleware,
    departmentAuth('fermentation'),
    getFermentationsFiltered
  );
  

// GET by ID - fermentation dept only
router.get('/fermentation/:id', authMiddleware, departmentAuth('fermentation'), getFermentationById);

// CREATE - operators/supervisors/hr/admins can create in fermentation dept
// Operators' entries will automatically set approved=false (in controller)
router.post(
  '/fermentation',
  authMiddleware,
  departmentAuth('fermentation'),
  roleAuth('operator', 'supervisor', 'hr', 'admin'),
  createFermentation
);

// UPDATE - operators can edit their unapproved entries; supervisors/hr/admins can edit all
router.put(
  '/fermentation/:id',
  authMiddleware,
  departmentAuth('fermentation'),
  roleAuth('operator', 'supervisor', 'hr', 'admin'),
  updateFermentation
);

// DELETE - supervisors, hr or admins only in fermentation dept
router.delete(
  '/fermentation/:id',
  authMiddleware,
  departmentAuth('fermentation'),
  roleAuth('supervisor', 'hr', 'admin'),
  deleteFermentation
);

// APPROVE - supervisors, hr or admins only in fermentation dept
router.patch(
  '/fermentation/:id/approve',
  authMiddleware,
  departmentAuth('fermentation'),
  roleAuth('supervisor', 'hr', 'admin'),
  approveFermentation
);

module.exports = router;
router.get('/fermentation', authMiddleware, departmentAuth('fermentation'), getFermentations);

// GET filtered fermentations (employees see only approved) - fermentation dept only
router.get(
    '/fermentation/filter',
    authMiddleware,
    departmentAuth('fermentation'),
    getFermentationsFiltered
  );
  

// GET by ID - fermentation dept only
router.get('/fermentation/:id', authMiddleware, departmentAuth('fermentation'), getFermentationById);

// CREATE - operators/supervisors/admins can create
// Operators’ entries will automatically set approved=false (in controller)
router.post(
  '/fermentation',
  authMiddleware,
  roleAuth('operator', 'supervisor', 'admin'),
  createFermentation
);

// UPDATE - operators can edit their unapproved entries; supervisors/admins can edit all
router.put(
  '/fermentation/:id',
  authMiddleware,
  roleAuth('operator', 'supervisor', 'admin'),
  updateFermentation
);

// DELETE - supervisors or admins only
router.delete(
  '/fermentation/:id',
  authMiddleware,
  roleAuth('supervisor', 'admin'),
  deleteFermentation
);

// APPROVE - supervisors or admins only
router.patch(
  '/fermentation/:id/approve',
  authMiddleware,
  roleAuth('supervisor', 'admin'),
  approveFermentation
);

module.exports = router;
