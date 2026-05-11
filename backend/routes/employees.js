const express = require('express');
const router = express.Router();
const employeeController = require('../controllers/employeeController');
const { auth, admin } = require('../middleware/auth');

// Employee routes - Restricted to Admin for sensitive operations
router.get('/employees', auth, employeeController.getAllEmployees);
router.get('/employees/:id', auth, employeeController.getEmployeeById);
router.post('/employees', auth, admin, employeeController.createEmployee);
router.put('/employees/:id', auth, admin, employeeController.updateEmployee);
router.delete('/employees/:id', auth, admin, employeeController.deleteEmployee);

module.exports = router;
