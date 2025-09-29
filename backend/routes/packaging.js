const express = require('express');
const router = express.Router();
const {
  getPackagings,
  getPackagingById,
  createPackaging,
  updatePackaging,
  deletePackaging
} = require('../controllers/packagingController');

router.get('/packaging', getPackagings);
router.get('/packaging/:id', getPackagingById);
router.post('/packaging', createPackaging);
router.put('/packaging/:id', updatePackaging);
router.delete('/packaging/:id', deletePackaging);

module.exports = router;
