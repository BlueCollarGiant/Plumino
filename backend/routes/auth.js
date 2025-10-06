const express = require('express');
const router = express.Router();
const { registerEmployee, loginEmployee } = require('../controllers/authController');

// Register new employee
router.post('/register', registerEmployee);

// Login
router.post('/login', loginEmployee);

module.exports = router;
