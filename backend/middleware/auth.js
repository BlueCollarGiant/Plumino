const jwt = require('jsonwebtoken');
const Employee = require('../models/employeeModel');

// Verify the token and attach user info
const authMiddleware = async (req, res, next) => {
  const token = req.headers['authorization']?.split(' ')[1]; // Expect "Bearer <token>"
  if (!token) return res.status(401).json({ message: 'No token provided' });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Fetch current user data from database to verify token is still valid
    const currentUser = await Employee.findById(decoded.id).select('-password');
    if (!currentUser) {
      return res.status(401).json({ message: 'User not found' });
    }

    // Check if user is still active
    if (!currentUser.isActive) {
      return res.status(401).json({ message: 'Account deactivated' });
    }

    // Verify that token role/department matches current database state
    if (decoded.role !== currentUser.role || decoded.department !== currentUser.department) {
      return res.status(401).json({ 
        message: 'Token invalid: role or department has changed. Please log in again.',
        requireReauth: true 
      });
    }

    // Attach current user data (not token data) to ensure freshness
    req.user = {
      id: currentUser._id,
      role: currentUser.role,
      department: currentUser.department,
      email: currentUser.email,
      name: currentUser.name
    };
    
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Token expired' });
    }
    return res.status(401).json({ message: 'Invalid token' });
  }
};

// Role-based access middleware
const roleAuth = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ message: 'Not authenticated' });
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ message: 'Access denied: insufficient permissions' });
    }
    next();
  };
};

module.exports = { authMiddleware, roleAuth };
