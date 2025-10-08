const express = require('express');
const router = express.Router();
const { registerEmployee, loginEmployee, getCurrentUser, logoutEmployee } = require('../controllers/authController');
const { authMiddleware } = require('../middleware/auth');

// Register new employee
router.post('/register', registerEmployee);

// Login
router.post('/login', loginEmployee);

// Get current user info (for role change detection)
router.get('/me', authMiddleware, getCurrentUser);

// Logout (track for auto-logout system)
router.post('/logout', authMiddleware, logoutEmployee);

module.exports = router;
