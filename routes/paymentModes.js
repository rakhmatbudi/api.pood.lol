const express = require('express');
const paymentModeController = require('../controllers/paymentModeController');
// You might add validation middleware for payment modes here

const router = express.Router();

router.get('/', paymentModeController.getAllPaymentModes);
router.get('/:id', paymentModeController.getPaymentModeById);
router.post('/', paymentModeController.createPaymentMode);
router.put('/:id', paymentModeController.updatePaymentMode);
router.delete('/:id', paymentModeController.deletePaymentMode);

module.exports = router;