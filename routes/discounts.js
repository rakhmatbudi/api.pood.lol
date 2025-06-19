// routes/discounts.js
const express = require('express');
const discountController = require('../controllers/discountController');
const authMiddleware = require('../middleware/authMiddleware'); // Essential for authentication
const tenantResolverMiddleware = require('../middleware/tenantResolverMiddleware'); 

const router = express.Router();

router.get('/', authMiddleware, tenantResolverMiddleware, discountController.getAllDiscounts); // Added getTempTenantId
router.get('/:id', authMiddleware, tenantResolverMiddleware, discountController.getDiscountById); // Added getTempTenantId
router.post('/', authMiddleware, tenantResolverMiddleware, discountController.createDiscount); // Added getTempTenantId
router.put('/:id', authMiddleware, tenantResolverMiddleware, discountController.updateDiscount); // Added getTempTenantId
router.delete('/:id', authMiddleware, tenantResolverMiddleware, discountController.deleteDiscount); // Added getTempTenantId

module.exports = router;