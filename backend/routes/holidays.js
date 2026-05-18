const express = require('express');
const router = express.Router();
const holidayController = require('../controllers/holidayController');
const { auth } = require('../middleware/auth');

router.get('/', auth, holidayController.getHolidays);

module.exports = router;
