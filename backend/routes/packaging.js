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
  deletePackaging
} = require('../controllers/packagingController');

// Aggregated stats endpoints for dashboard charts
router.get('/packaging/stats/by-plant', getPackagingByPlant);
router.get('/packaging/stats/by-product', getPackagingByProduct);
router.get('/packaging/stats/by-campaign', getPackagingByCampaign);
router.get('/packaging/stats/by-date', getPackagingByDate);

// GET /packaging/filter → return packaging data matching optional filters
router.get('/packaging/filter', getFilteredPackaging);

router.get('/packaging', getPackagings);
router.get('/packaging/:id', getPackagingById);
router.post('/packaging', createPackaging);
router.put('/packaging/:id', updatePackaging);
router.delete('/packaging/:id', deletePackaging);

module.exports = router;
