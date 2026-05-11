const express = require('express');
const router = express.Router();
const attendanceController = require('../controllers/attendanceController');
const { auth } = require('../middleware/auth');

router.get('/attendance', auth, attendanceController.getAllAttendance);
router.post('/attendance', auth, attendanceController.createAttendance);

module.exports = router;
