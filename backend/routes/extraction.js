const express = require('express');
const router = express.Router();
const {
  getExtractions,
  getExtractionsFiltered,
  getExtractionById,
  createExtraction,
  updateExtraction,
  deleteExtraction
} = require('../controllers/extractionController');

router.get('/extraction/filter', getExtractionsFiltered);
router.get('/extraction', getExtractions);
router.get('/extraction/:id', getExtractionById);
router.post('/extraction', createExtraction);
router.put('/extraction/:id', updateExtraction);
router.delete('/extraction/:id', deleteExtraction);

module.exports = router;
