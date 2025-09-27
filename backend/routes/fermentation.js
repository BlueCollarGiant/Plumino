const express = require('express');
const router = express.Router();
const { getFermentations, createFermentation } = require('../controllers/fermentationController');

// GET all fermentations
router.get('/fermentation', getFermentations);

// POST new fermentation record
router.post('/fermentation', createFermentation);

module.exports = router;
