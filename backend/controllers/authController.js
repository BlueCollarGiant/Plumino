const jwt = require('jsonwebtoken');
const Employee = require('../models/employeeModel');
const bcrypt = require('bcryptjs');
const { autoLogoutManager } = require('../services/autoLogoutManager');

// Helper to create JWT
const generateToken = (employee) => {
  return jwt.sign(
    { id: employee._id, role: employee.role, department: employee.department },
    process.env.JWT_SECRET,
    { expiresIn: '1d' }
  );
};

// REGISTER new employee
const registerEmployee = async (req, res) => {
  const { name, email, password, role, department } = req.body;

  try {
    const existing = await Employee.findOne({ email });
    if (existing) return res.status(400).json({ message: 'Email already in use' });

    const employee = new Employee({ name, email, password, role, department });
    await employee.save();

    const token = generateToken(employee);
    res.status(201).json({ 
      message: 'Employee registered successfully',
      token,
      employee: { id: employee._id, name: employee.name, role: employee.role, department: employee.department }
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// LOGIN existing employee
const loginEmployee = async (req, res) => {
  const { email, password } = req.body;

  try {
    const employee = await Employee.findOne({ email });
    if (!employee) return res.status(401).json({ message: 'Invalid credentials' });

    const isMatch = await employee.matchPassword(password);
    if (!isMatch) return res.status(401).json({ message: 'Invalid credentials' });

    // Mark user as logged out since any pending role changes
    await autoLogoutManager.markUserLoggedOut(employee._id);

    const token = generateToken(employee);
    res.json({
      message: 'Login successful',
      token,
      employee: { id: employee._id, name: employee.name, role: employee.role, department: employee.department }
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// GET current user info (for role change detection)
const getCurrentUser = async (req, res) => {
  try {
    // Get fresh user data from database
    const employee = await Employee.findById(req.user.id).select('-password');
    if (!employee) {
      return res.status(404).json({ message: 'Employee not found' });
    }

    res.json({
      id: employee._id,
      name: employee.name,
      email: employee.email,
      role: employee.role,
      department: employee.department,
      title: employee.title,
      isActive: employee.isActive
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// LOGOUT user (track for auto-logout system)
const logoutEmployee = async (req, res) => {
  try {
    // Mark user as logged out since any pending role changes
    await autoLogoutManager.markUserLoggedOut(req.user.id);
    
    res.json({ message: 'Logout successful' });
  } catch (err) {
    console.error('Logout error:', err);
    res.status(500).json({ message: err.message });
  }
};

module.exports = { registerEmployee, loginEmployee, getCurrentUser, logoutEmployee };
