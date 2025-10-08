const Employee = require('../models/employeeModel');

// Middleware to check if user's role has changed since token was issued
const roleChangeCheck = async (req, res, next) => {
  try {
    if (!req.user || !req.user.id) {
      return next();
    }

    // Get current user data from database
    const currentUser = await Employee.findById(req.user.id).select('role');
    
    if (!currentUser) {
      return res.status(401).json({ 
        message: 'User not found. Please log in again.',
        roleChanged: true 
      });
    }

    // Check if role in token matches current role in database
    if (req.user.role !== currentUser.role) {
      return res.status(401).json({ 
        message: 'Your role has been updated. Please log in again to access your new permissions.',
        roleChanged: true 
      });
    }

    next();
  } catch (error) {
    console.error('Role change check error:', error);
    return res.status(500).json({ message: 'Server error during role validation' });
  }
};

module.exports = { roleChangeCheck };