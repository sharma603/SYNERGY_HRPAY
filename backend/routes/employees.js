const express = require('express');
const router = express.Router();
const employeeController = require('../controllers/employeeController');
const { auth, admin } = require('../middleware/auth');
const multer = require('multer');

// Configure multer for memory storage
const storage = multer.memoryStorage();
const upload = multer({ storage: storage }).single('image');

// Employee routes - Restricted to Admin for sensitive operations
router.get('/employees', auth, employeeController.getAllEmployees);
router.get('/employees/:id', auth, employeeController.getEmployeeById);
router.post('/employees', auth, admin, upload, employeeController.createEmployee);
router.put('/employees/:id', auth, admin, upload, employeeController.updateEmployee);
router.delete('/employees/:id', auth, admin, employeeController.deleteEmployee);

module.exports = router;
