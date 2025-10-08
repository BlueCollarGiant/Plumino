const express = require('express');
const router = express.Router();

const { getEmployee, createEmployee, deleteEmployee, deactivateEmployee } = require('../controllers/employeeController');

// GET /api/employees → fetch all employees
router.get('/employees', getEmployee);

// POST /api/employees → create new employee
router.post('/employees', createEmployee);

// DELETE /api/employees/:id → delete employee
router.delete('/employees/:id', deleteEmployee);

// PATCH /api/employees/:id/deactivate → deactivate employee
router.patch('/employees/:id/deactivate', deactivateEmployee);

module.exports = router;
