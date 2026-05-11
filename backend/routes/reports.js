const express = require('express');
const router = express.Router();
const reportController = require('../controllers/reportController');
const { auth, admin } = require('../middleware/auth');

// Cost Allocation Report routes - Restricted to Admin/HR
router.get('/cost-allocation', auth, reportController.getCostAllocationReport);
router.post('/cost-allocation', auth, reportController.getCostAllocationReport);
router.get('/cost-allocation/export', auth, reportController.exportCostAllocationReport);
router.get('/designation-summary', auth, reportController.getDesignationMultiPeriodSummary);
router.post('/designation-summary', auth, reportController.getDesignationMultiPeriodSummary);
router.get('/designation-summary-filters', auth, reportController.getDesignationMultiPeriodSummarywithfilters);
router.post('/designation-summary-filters', auth, reportController.getDesignationMultiPeriodSummarywithfilters);
router.get('/annual-leave-exit-permit', auth, reportController.getAnnualLeaveExitPermit);
router.post('/annual-leave-exit-permit', auth, reportController.getAnnualLeaveExitPermit);
router.get('/attendance-register', auth, reportController.getAttendanceRegister);
router.post('/attendance-register', auth, reportController.getAttendanceRegister);
router.get('/employee-site-location', auth, reportController.getEmployeeProjectReport);
router.post('/employee-site-location', auth, reportController.getEmployeeProjectReport);

module.exports = router;
