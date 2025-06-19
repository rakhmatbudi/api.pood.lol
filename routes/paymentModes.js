const express = require('express');
const paymentModeController = require('../controllers/paymentModeController');
const authMiddleware = require('../middleware/authMiddleware'); // Essential for authentication
const tenantResolverMiddleware = require('../middleware/tenantResolverMiddleware'); 

const router = express.Router();

router.get('/', authMiddleware, tenantResolverMiddleware, paymentModeController.getAllPaymentModes); // Added getTempTenantId
router.get('/:id', authMiddleware, tenantResolverMiddleware, paymentModeController.getPaymentModeById); // Added getTempTenantId
router.post('/', authMiddleware, tenantResolverMiddleware, paymentModeController.createPaymentMode); // Added getTempTenantId
router.put('/:id', authMiddleware, tenantResolverMiddleware, paymentModeController.updatePaymentMode); // Added getTempTenantId
router.delete('/:id', authMiddleware, tenantResolverMiddleware, paymentModeController.deletePaymentMode); // Added getTempTenantId

module.exports = router;