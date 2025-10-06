const jwt = require('jsonwebtoken');
const Employee = require('../models/employeeModel');
const bcrypt = require('bcryptjs');

// Helper to create JWT
const generateToken = (employee) => {
  return jwt.sign(
    { id: employee._id, role: employee.role },
    process.env.JWT_SECRET,
    { expiresIn: '1d' }
  );
};

// REGISTER new employee
const registerEmployee = async (req, res) => {
  const { name, email, password, role } = req.body;

  try {
    const existing = await Employee.findOne({ email });
    if (existing) return res.status(400).json({ message: 'Email already in use' });

    const employee = new Employee({ name, email, password, role });
    await employee.save();

    const token = generateToken(employee);
    res.status(201).json({ 
      message: 'Employee registered successfully',
      token,
      employee: { id: employee._id, name: employee.name, role: employee.role }
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

    const token = generateToken(employee);
    res.json({
      message: 'Login successful',
      token,
      employee: { id: employee._id, name: employee.name, role: employee.role }
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = { registerEmployee, loginEmployee };
