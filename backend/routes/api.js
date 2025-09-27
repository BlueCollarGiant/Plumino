const express = require('express');
const router = express.Router();

const { getEmployee, createEmployee } = require('../controllers/employeeController');


// POST /employee → create new employee
router.get('/employee', getEmployee)


// GET /employees → fetch all employees
router.post('/employee', createEmployee);

module.exports = router;
