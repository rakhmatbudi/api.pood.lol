const express = require('express');
const paymentModeController = require('../controllers/paymentModeController');
const authMiddleware = require('../middleware/authMiddleware'); // Essential for authentication
const tenantResolverMiddleware = require('../middleware/tenantResolverMiddleware');

const router = express.Router();

// Apply authentication and tenant resolution middleware to ALL subsequent routes in this router.
router.use(authMiddleware, tenantResolverMiddleware);

// All routes below this point will automatically have authMiddleware and tenantResolverMiddleware applied.

router.get('/', paymentModeController.getAllPaymentModes);
router.get('/:id', paymentModeController.getPaymentModeById);
router.post('/', paymentModeController.createPaymentMode);
router.put('/:id', paymentModeController.updatePaymentMode);
router.delete('/:id', paymentModeController.deletePaymentMode);

module.exports = router;