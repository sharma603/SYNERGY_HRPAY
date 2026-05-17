const express = require('express');
const router = express.Router();
const { sendEmployeeEmail } = require('../controllers/emailController');
const { auth } = require('../middleware/auth');

/**
 * @route   POST /api/email/send
 * @desc    Send email to employee
 * @access  Private
 */
router.post('/send', auth, sendEmployeeEmail);

module.exports = router;
