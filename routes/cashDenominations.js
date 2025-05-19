const express = require('express');
const router = express.Router();
const cashDenominationController = require('../controllers/cashDenominationController');

// Route to get all cash denominations
router.get('/', cashDenominationController.getAllDenominations);

module.exports = router;