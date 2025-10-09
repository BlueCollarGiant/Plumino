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

const { authMiddleware, roleAuth } = require('../middleware/auth');
const { departmentAuth } = require('../middleware/departmentAuth');

// Listing and detail routes
router.get('/fermentation', authMiddleware, departmentAuth('fermentation'), getFermentations);
router.get('/fermentation/filter', authMiddleware, departmentAuth('fermentation'), getFermentationsFiltered);
router.get('/fermentation/:id', authMiddleware, departmentAuth('fermentation'), getFermentationById);

// Create / Update / Delete
router.post(
  '/fermentation',
  authMiddleware,
  departmentAuth('fermentation'),
  roleAuth('operator', 'supervisor', 'hr', 'admin'),
  createFermentation
);

router.put(
  '/fermentation/:id',
  authMiddleware,
  departmentAuth('fermentation'),
  roleAuth('operator', 'supervisor', 'hr', 'admin'),
  updateFermentation
);

router.delete(
  '/fermentation/:id',
  authMiddleware,
  departmentAuth('fermentation'),
  roleAuth('operator', 'supervisor', 'hr', 'admin'),
  deleteFermentation
);

// Approval
router.put(
  '/fermentation/:id/approve',
  authMiddleware,
  departmentAuth('fermentation'),
  roleAuth('supervisor', 'hr', 'admin'),
  approveFermentation
);

module.exports = router;
