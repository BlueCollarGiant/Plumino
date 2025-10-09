const express = require('express');
const router = express.Router();

const { authMiddleware, roleAuth } = require('../middleware/auth');
const { roleChangeCheck } = require('../middleware/roleChangeCheck');
const { getEmployee, createEmployee, deleteEmployee, deactivateEmployee, updateEmployee } = require('../controllers/employeeController');

// GET /api/employees → fetch all employees (HR/Admin only)
router.get('/employees', authMiddleware, roleChangeCheck, roleAuth('admin', 'hr'), getEmployee);

// POST /api/employees → create new employee (HR/Admin only)
router.post('/employees', authMiddleware, roleChangeCheck, roleAuth('admin', 'hr'), createEmployee);

// PUT /api/employees/:id → update employee (HR/Admin only)
router.put('/employees/:id', authMiddleware, roleChangeCheck, roleAuth('admin', 'hr'), updateEmployee);

// DELETE /api/employees/:id → delete employee (HR/Admin only)
router.delete('/employees/:id', authMiddleware, roleChangeCheck, roleAuth('admin', 'hr'), deleteEmployee);

// PATCH /api/employees/:id/deactivate → deactivate employee (HR/Admin only)
router.patch('/employees/:id/deactivate', authMiddleware, roleChangeCheck, roleAuth('admin', 'hr'), deactivateEmployee);

module.exports = router;
