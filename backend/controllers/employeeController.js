const Employee = require('../models/employeeModel');
const Joi = require('joi');
const bcrypt = require('bcryptjs');
const { sseManager } = require('../services/sseManager');
const { autoLogoutManager } = require('../services/autoLogoutManager');

const employeeSchema = Joi.object({
  name: Joi.string().min(2).required(),
  email: Joi.string().email().required(),
  password: Joi.string().min(6).required(),
  role: Joi.string().valid('admin', 'hr', 'supervisor', 'operator').required(),
  department: Joi.string().min(2).required(),
  title: Joi.string().min(1).optional().allow(''),
  supervisorId: Joi.string().optional().allow(null, '')
});

// Controller: get all employees
const getEmployee = async (req, res) => {
  try {
    const employees = await Employee.find().select('-password').populate('supervisorId', 'name email');
    console.log(`Found ${employees.length} employees`);
    res.json(employees);
  } catch (error) {
    console.error('Error fetching employees:', error);
    res.status(500).json({ message: error.message });
  }
};

// Controller: create new employee
const createEmployee = async (req, res) => {
  try {
    // Validate request body
    const { error, value } = employeeSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ message: error.details[0].message });
    }

    // Check if email already exists
    const existingEmployee = await Employee.findOne({ email: value.email });
    if (existingEmployee) {
      return res.status(400).json({ message: 'Employee with this email already exists' });
    }

    // Validate supervisor assignment if provided
    if (value.supervisorId) {
      const supervisor = await Employee.findById(value.supervisorId);
      if (!supervisor) {
        return res.status(400).json({ message: 'Supervisor not found' });
      }
      
      // Ensure supervisor is in the same department
      if (supervisor.department !== value.department) {
        return res.status(400).json({ message: 'Supervisor must be in the same department' });
      }
    }

    // Create new employee (password will be hashed by pre-save hook)
    const employee = new Employee(value);
    const saved = await employee.save();
    
    // Return employee without password and populate supervisor
    const populated = await Employee.findById(saved._id).select('-password').populate('supervisorId', 'name email');
    console.log('Created new employee:', populated.email);
    
    res.status(201).json(populated);
  } catch (error) {
    console.error('Error creating employee:', error);
    res.status(400).json({ message: error.message });
  }
};

// Controller: delete employee
const deleteEmployee = async (req, res) => {
  try {
    const { id } = req.params;
    
    const employee = await Employee.findById(id);
    if (!employee) {
      return res.status(404).json({ message: 'Employee not found' });
    }

    await Employee.findByIdAndDelete(id);
    console.log('Deleted employee:', employee.email);
    
    res.status(200).json({ message: 'Employee deleted successfully' });
  } catch (error) {
    console.error('Error deleting employee:', error);
    res.status(500).json({ message: error.message });
  }
};

// Controller: deactivate employee
const deactivateEmployee = async (req, res) => {
  try {
    const { id } = req.params;
    
    const employee = await Employee.findByIdAndUpdate(
      id,
      { isActive: false },
      { new: true }
    ).select('-password');

    if (!employee) {
      return res.status(404).json({ message: 'Employee not found' });
    }

    console.log('Deactivated employee:', employee.email);
    res.status(200).json(employee);
  } catch (error) {
    console.error('Error deactivating employee:', error);
    res.status(500).json({ message: error.message });
  }
};

// Controller: update employee
const updateEmployee = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Create validation schema for updates (no password required)
    const updateSchema = Joi.object({
      name: Joi.string().min(2).required(),
      email: Joi.string().email().required(),
      role: Joi.string().valid('admin', 'hr', 'supervisor', 'operator').required(),
      department: Joi.string().min(2).required(),
      title: Joi.string().min(1).optional().allow(''),
      supervisorId: Joi.string().optional().allow(null, '')
    });

    // Validate request body
    const { error, value } = updateSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ message: error.details[0].message });
    }

    // Check if employee exists
    const existingEmployee = await Employee.findById(id);
    if (!existingEmployee) {
      return res.status(404).json({ message: 'Employee not found' });
    }

    // Check if email is being changed to one that already exists
    if (value.email !== existingEmployee.email) {
      const emailExists = await Employee.findOne({ email: value.email, _id: { $ne: id } });
      if (emailExists) {
        return res.status(400).json({ message: 'Employee with this email already exists' });
      }
    }

    // Validate supervisor assignment if provided
    if (value.supervisorId) {
      // Employee cannot supervise themselves
      if (value.supervisorId === id) {
        return res.status(400).json({ message: 'Employee cannot supervise themselves' });
      }

      const supervisor = await Employee.findById(value.supervisorId);
      if (!supervisor) {
        return res.status(400).json({ message: 'Supervisor not found' });
      }
      
      // Ensure supervisor is in the same department
      if (supervisor.department !== value.department) {
        return res.status(400).json({ message: 'Supervisor must be in the same department' });
      }
    }

    // Track changes for real-time notifications
    const roleChanged = existingEmployee.role !== value.role;
    const departmentChanged = existingEmployee.department !== value.department;

    // Update employee
    const updatedEmployee = await Employee.findByIdAndUpdate(
      id,
      value,
      { new: true }
    ).select('-password').populate('supervisorId', 'name email');

    console.log('Updated employee:', updatedEmployee.email);
    
    // Handle role/department changes with 24-hour auto-logout tracking
    if (roleChanged || departmentChanged) {
      // Track role change for 24-hour auto-logout system
      await autoLogoutManager.trackRoleChange(
        id,
        existingEmployee.role,
        updatedEmployee.role,
        departmentChanged ? existingEmployee.department : null,
        departmentChanged ? updatedEmployee.department : null
      );

      // Send real-time notifications
      if (roleChanged) {
        sseManager.notifyRoleChange(id, {
          name: updatedEmployee.name,
          oldRole: existingEmployee.role,
          newRole: updatedEmployee.role
        });
      }
      
      if (departmentChanged) {
        sseManager.notifyDepartmentChange(id, {
          name: updatedEmployee.name,
          oldDepartment: existingEmployee.department,
          newDepartment: updatedEmployee.department
        });
      }
    }

    res.status(200).json(updatedEmployee);
  } catch (error) {
    console.error('Error updating employee:', error);
    res.status(500).json({ message: error.message });
  }
};

module.exports = { getEmployee, createEmployee, updateEmployee, deleteEmployee, deactivateEmployee };
