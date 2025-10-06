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

// GET all (frontend only sees approved ones)
router.get('/fermentation', authMiddleware, getFermentations);

// GET filtered fermentations (operators see only approved)
router.get(
    '/fermentation/filter',
    authMiddleware,
    getFermentationsFiltered
  );
  

// GET by ID
router.get('/fermentation/:id', authMiddleware, getFermentationById);

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
