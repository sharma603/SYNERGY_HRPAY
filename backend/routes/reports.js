const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');

// Import individual report controllers
const costAllocationController = require('../controllers/reports/costAllocationController');
const designationSummaryController = require('../controllers/reports/designationSummaryController');
const annualLeaveController = require('../controllers/reports/annualLeaveController');
const attendanceRegisterController = require('../controllers/reports/attendanceRegisterController');
const attendanceRegisterAllController = require('../controllers/reports/attendanceRegisterAllController');
const employeeProjectController = require('../controllers/reports/employeeProjectController');

// Cost Allocation Report routes - Restricted to Admin/HR
router.get('/cost-allocation', auth, costAllocationController.synHRM_Cost_Allocation_Report);
router.post('/cost-allocation', auth, costAllocationController.synHRM_Cost_Allocation_Report);
router.get('/cost-allocation/export', auth, costAllocationController.synHRM_Cost_Allocation_Report_Export);

// Designation Summary routes
router.get('/designation-summary', auth, designationSummaryController.synDesignationMultiPeriodSummary);
router.post('/designation-summary', auth, designationSummaryController.synDesignationMultiPeriodSummary);
router.get('/designation-summary-filters', auth, designationSummaryController.synDesignationMultiPeriodSummarywithfilters);
router.post('/designation-summary-filters', auth, designationSummaryController.synDesignationMultiPeriodSummarywithfilters);

// Annual Leave Exit Permit routes
router.get('/annual-leave-exit-permit', auth, annualLeaveController.getAnnualLeaveExitPermit);
router.post('/annual-leave-exit-permit', auth, annualLeaveController.getAnnualLeaveExitPermit);

// Attendance Register routes
router.get('/attendance-register', auth, attendanceRegisterController.getAttendanceRegister);
router.post('/attendance-register', auth, attendanceRegisterController.getAttendanceRegister);
router.get('/attendance-register-all', auth, attendanceRegisterAllController.getAttendanceRegisterAll);
router.post('/attendance-register-all', auth, attendanceRegisterAllController.getAttendanceRegisterAll);
router.post('/attendance-register-all/update-status', auth, attendanceRegisterAllController.updateAttendanceStatus);

// Employee Site Location routes
router.get('/employee-site-location', auth, employeeProjectController.getEmployeeProjectReport);
router.post('/employee-site-location', auth, employeeProjectController.getEmployeeProjectReport);

module.exports = router;
