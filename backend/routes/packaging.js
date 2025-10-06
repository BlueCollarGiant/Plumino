// routes/packaging.js
const express = require('express');
const router = express.Router();

const {
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
  deletePackaging
} = require('../controllers/packagingController');

const { authMiddleware, roleAuth } = require('../middleware/auth');

// Dashboard stats — everyone logged in can view
router.get('/packaging/stats/by-plant', authMiddleware, getPackagingByPlant);
router.get('/packaging/stats/by-product', authMiddleware, getPackagingByProduct);
router.get('/packaging/stats/by-campaign', authMiddleware, getPackagingByCampaign);
router.get('/packaging/stats/by-date', authMiddleware, getPackagingByDate);

// Filters — all logged in users
router.get('/packaging/filter', authMiddleware, getFilteredPackaging);
router.get('/packaging', authMiddleware, getPackagings);
router.get('/packaging/:id', authMiddleware, getPackagingById);

// CREATE — Operator, Supervisor, Admin
router.post(
  '/packaging',
  authMiddleware,
  roleAuth('operator', 'supervisor', 'admin'),
  createPackaging
);

// UPDATE — Operator, Supervisor, Admin
router.put(
  '/packaging/:id',
  authMiddleware,
  roleAuth('operator', 'supervisor', 'admin'),
  updatePackaging
);

// DELETE — Supervisor/Admin only
router.delete(
  '/packaging/:id',
  authMiddleware,
  roleAuth('supervisor', 'admin'),
  deletePackaging
);

// APPROVE — Supervisor/Admin only
router.put(
  '/packaging/:id/approve',
  authMiddleware,
  roleAuth('supervisor', 'admin'),
  approvePackaging
);


module.exports = router;
