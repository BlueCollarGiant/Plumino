const express = require('express');
const router = express.Router();
const {
  getFermentations,
  getFermentationById,
  createFermentation,
  updateFermentation,
  deleteFermentation
} = require('../controllers/fermentationController');

router.get('/fermentation', getFermentations);
router.get('/fermentation/:id', getFermentationById);
router.post('/fermentation', createFermentation);
router.put('/fermentation/:id', updateFermentation);
router.delete('/fermentation/:id', deleteFermentation);

module.exports = router;
