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

// GET (approved only shown to non-supervisor/admin)
router.get('/extraction', authMiddleware, getExtractions);
router.get('/extraction/filter', authMiddleware, getExtractionsFiltered);
router.get('/extraction/:id', authMiddleware, getExtractionById);

// CREATE — Operator, Supervisor, Admin
router.post(
  '/extraction',
  authMiddleware,
  roleAuth('operator', 'supervisor', 'admin'),
  createExtraction
);

// UPDATE — Operator (own), Supervisor/Admin (any)
router.put(
  '/extraction/:id',
  authMiddleware,
  roleAuth('operator', 'supervisor', 'admin'),
  updateExtraction
);

// DELETE — Supervisor/Admin only
router.delete(
  '/extraction/:id',
  authMiddleware,
  roleAuth('supervisor', 'admin'),
  deleteExtraction
);

router.put(
  '/extraction/:id/approve',
  authMiddleware,
  roleAuth('supervisor', 'admin'),
  approveExtraction
);
module.exports = router;
