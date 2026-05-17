const express = require('express');
const router = express.Router();
const attendanceController = require('../controllers/attendanceController');
const absenteeController = require('../controllers/absenteeController');
const settingsController = require('../controllers/settingsController');
const { auth } = require('../middleware/auth');

router.get('/attendance', auth, attendanceController.getAllAttendance);
router.post('/attendance', auth, attendanceController.createAttendance);

// Absentee routes
router.get('/absentees', auth, absenteeController.getAbsentees);
router.post('/absentees/notify', auth, absenteeController.sendBulkNotifications);

// Automation Settings
router.get('/absentees/settings', auth, settingsController.getSettings);
router.post('/absentees/settings', auth, settingsController.updateSettings);

module.exports = router;
