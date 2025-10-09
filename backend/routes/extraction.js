// routes/extraction.js
const express = require('express');
const router = express.Router();

const {
  getExtractions,
  getExtractionsFiltered,
  getExtractionById,
  createExtraction,
  updateExtraction,
  approveExtraction,
  deleteExtraction
} = require('../controllers/extractionController');

const { authMiddleware, roleAuth } = require('../middleware/auth');
const { departmentAuth } = require('../middleware/departmentAuth');

// GET (approved only shown to non-supervisor/admin) - extraction dept only
router.get('/extraction', authMiddleware, departmentAuth('extraction'), getExtractions);
router.get('/extraction/filter', authMiddleware, departmentAuth('extraction'), getExtractionsFiltered);
router.get('/extraction/:id', authMiddleware, departmentAuth('extraction'), getExtractionById);

// CREATE — Operator, Supervisor in extraction dept, or HR/Admin
router.post(
  '/extraction',
  authMiddleware,
  departmentAuth('extraction'),
  roleAuth('operator', 'supervisor', 'hr', 'admin'),
  createExtraction
);

// UPDATE — Operator (own), Supervisor/HR/Admin (any) in extraction dept
router.put(
  '/extraction/:id',
  authMiddleware,
  departmentAuth('extraction'),
  roleAuth('operator', 'supervisor', 'hr', 'admin'),
  updateExtraction
);

// DELETE — operators can delete their own pending records; supervisors/hr/admins can delete any
router.delete(
  '/extraction/:id',
  authMiddleware,
  departmentAuth('extraction'),
  roleAuth('operator', 'supervisor', 'hr', 'admin'),
  deleteExtraction
);

router.put(
  '/extraction/:id/approve',
  authMiddleware,
  departmentAuth('extraction'),
  roleAuth('supervisor', 'hr', 'admin'),
  approveExtraction
);
module.exports = router;
