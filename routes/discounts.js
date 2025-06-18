// routes/discounts.js
const express = require('express');
const discountController = require('../controllers/discountController');
const { getTempTenantId } = require('../middleware/tempTenantMiddleware'); // <--- IMPORT the tenant middleware

const router = express.Router();

router.get('/', getTempTenantId, discountController.getAllDiscounts); // Added getTempTenantId
router.get('/:id', getTempTenantId, discountController.getDiscountById); // Added getTempTenantId
router.post('/', getTempTenantId, discountController.createDiscount); // Added getTempTenantId
router.put('/:id', getTempTenantId, discountController.updateDiscount); // Added getTempTenantId
router.delete('/:id', getTempTenantId, discountController.deleteDiscount); // Added getTempTenantId

module.exports = router;