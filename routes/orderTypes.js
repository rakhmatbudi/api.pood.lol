const express = require('express');
const orderTypeController = require('../controllers/orderTypeController');
const authMiddleware = require('../middleware/authMiddleware'); // Essential for authentication
const tenantResolverMiddleware = require('../middleware/tenantResolverMiddleware'); 

const router = express.Router();

// Get all order types
router.get('/', authMiddleware, tenantResolverMiddleware, orderTypeController.getAllOrderTypes); // Added getTempTenantId

// Create a new order type
router.post('/', authMiddleware, tenantResolverMiddleware, orderTypeController.createOrderType); // Added getTempTenantId

// Get a single order type by ID
router.get('/:id', authMiddleware, tenantResolverMiddleware, orderTypeController.getOrderTypeById); // Added getTempTenantId

// Update an order type by ID
router.put('/:id', authMiddleware, tenantResolverMiddleware, orderTypeController.updateOrderType); // Added getTempTenantId

// Delete an order type by ID
router.delete('/:id', authMiddleware, tenantResolverMiddleware, orderTypeController.deleteOrderType); // Added getTempTenantId

module.exports = router;