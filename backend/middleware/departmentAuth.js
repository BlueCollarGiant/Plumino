// middleware/departmentAuth.js

// Department-based access control middleware
const departmentAuth = (...allowedDepartments) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Not authenticated' });
    }

    // Office department (HR/Admin) can access all departments
    if (req.user.department === 'office') {
      return next();
    }

    // Check if user's department is in allowed departments
    if (!allowedDepartments.includes(req.user.department)) {
      return res.status(403).json({ message: 'Access denied: insufficient department permissions' });
    }

    next();
  };
};

// Add department filter to query based on user's department
const addDepartmentFilter = (req, baseFilters = {}) => {
  // Office department (HR/Admin) can see all data
  if (req.user.department === 'office') {
    return baseFilters;
  }

  // Add department-specific filtering logic
  // This will be used in controllers to filter data by department context
  return {
    ...baseFilters,
    userDepartment: req.user.department
  };
};

module.exports = { departmentAuth, addDepartmentFilter };