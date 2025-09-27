const express = require('express');
const router = express.Router();

const { getEmployee, createEmployee } = require('../controllers/employeeController');


router.get('/employee', getEmployee)
router.post('/employee', createEmployee);

module.exports = router;
