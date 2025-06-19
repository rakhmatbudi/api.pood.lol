// routes/orderStatuses.js
const express = require('express');
const orderStatusController = require('../controllers/orderStatusController');
const authMiddleware = require('../middleware/authMiddleware'); // Essential for authentication
const tenantResolverMiddleware = require('../middleware/tenantResolverMiddleware'); 

const router = express.Router();

// GET all order statuses
router.get('/', authMiddleware, tenantResolverMiddleware, orderStatusController.getAllOrderStatuses); // Added getTempTenantId

// GET order status by ID
router.get('/:id', authMiddleware, tenantResolverMiddleware, orderStatusController.getOrderStatusById); // Added getTempTenantId

// POST create new order status
router.post('/', authMiddleware, tenantResolverMiddleware, orderStatusController.createOrderStatus); // Added getTempTenantId

// PUT update order status by ID
router.put('/:id', authMiddleware, tenantResolverMiddleware, orderStatusController.updateOrderStatus); // Added getTempTenantId

// DELETE order status by ID
router.delete('/:id', authMiddleware, tenantResolverMiddleware, orderStatusController.deleteOrderStatus); // Added getTempTenantId

module.exports = router;