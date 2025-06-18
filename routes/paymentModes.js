const express = require('express');
const paymentModeController = require('../controllers/paymentModeController');
const { getTempTenantId } = require('../middleware/tempTenantMiddleware'); // <--- IMPORT the tenant middleware
// You might add validation middleware for payment modes here

const router = express.Router();

router.get('/', getTempTenantId, paymentModeController.getAllPaymentModes); // Added getTempTenantId
router.get('/:id', getTempTenantId, paymentModeController.getPaymentModeById); // Added getTempTenantId
router.post('/', getTempTenantId, paymentModeController.createPaymentMode); // Added getTempTenantId
router.put('/:id', getTempTenantId, paymentModeController.updatePaymentMode); // Added getTempTenantId
router.delete('/:id', getTempTenantId, paymentModeController.deletePaymentMode); // Added getTempTenantId

module.exports = router;