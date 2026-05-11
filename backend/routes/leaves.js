const express = require('express');
const router = express.Router();
const leaveController = require('../controllers/leaveController');
const { auth } = require('../middleware/auth');

router.get('/leaves', auth, leaveController.getAllLeaves);
router.post('/leaves', auth, leaveController.createLeave);

module.exports = router;
