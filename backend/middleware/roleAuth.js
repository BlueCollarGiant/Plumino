// middleware/roleAuth.js
module.exports = function (...allowedRoles) {
    return (req, res, next) => {
      // Make sure the user is authenticated
      if (!req.user) {
        return res.status(401).json({ message: 'Not authenticated' });
      }
  
      // Check if their role matches one of the allowed roles
      if (!allowedRoles.includes(req.user.role)) {
        return res.status(403).json({ message: 'Access denied: insufficient permissions' });
      }
  
      // All good — continue
      next();
    };
  };
  