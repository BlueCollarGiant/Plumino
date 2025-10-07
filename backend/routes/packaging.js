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
const { departmentAuth } = require('../middleware/departmentAuth');

// Dashboard stats — only packaging department and office can view
router.get('/packaging/stats/by-plant', authMiddleware, departmentAuth('packaging'), getPackagingByPlant);
router.get('/packaging/stats/by-product', authMiddleware, departmentAuth('packaging'), getPackagingByProduct);
router.get('/packaging/stats/by-campaign', authMiddleware, departmentAuth('packaging'), getPackagingByCampaign);
router.get('/packaging/stats/by-date', authMiddleware, departmentAuth('packaging'), getPackagingByDate);

// Filters — packaging department and office users
router.get('/packaging/filter', authMiddleware, departmentAuth('packaging'), getFilteredPackaging);
router.get('/packaging', authMiddleware, departmentAuth('packaging'), getPackagings);
router.get('/packaging/:id', authMiddleware, departmentAuth('packaging'), getPackagingById);

// CREATE — Operator, Supervisor in packaging dept, or HR/Admin
router.post(
  '/packaging',
  authMiddleware,
  departmentAuth('packaging'),
  roleAuth('operator', 'supervisor', 'hr', 'admin'),
  createPackaging
);

// UPDATE — Operator, Supervisor in packaging dept, or HR/Admin
router.put(
  '/packaging/:id',
  authMiddleware,
  departmentAuth('packaging'),
  roleAuth('operator', 'supervisor', 'hr', 'admin'),
  updatePackaging
);

// DELETE — Supervisor/HR/Admin only in packaging dept
router.delete(
  '/packaging/:id',
  authMiddleware,
  departmentAuth('packaging'),
  roleAuth('supervisor', 'hr', 'admin'),
  deletePackaging
);

// APPROVE — Supervisor/HR/Admin only in packaging dept
router.put(
  '/packaging/:id/approve',
  authMiddleware,
  departmentAuth('packaging'),
  roleAuth('supervisor', 'hr', 'admin'),
  approvePackaging
);


module.exports = router;
