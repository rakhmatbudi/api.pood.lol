// routes/orderStatuses.js
const express = require('express');
const orderStatusController = require('../controllers/orderStatusController');
const authMiddleware = require('../middleware/authMiddleware'); // Essential for authentication
const tenantResolverMiddleware = require('../middleware/tenantResolverMiddleware');

const router = express.Router();

// Apply authentication and tenant resolution middleware to ALL subsequent routes in this router.
router.use(authMiddleware, tenantResolverMiddleware);

// All routes below this point will automatically have authMiddleware and tenantResolverMiddleware applied.

// GET all order statuses
router.get('/', orderStatusController.getAllOrderStatuses);

// GET order status by ID
router.get('/:id', orderStatusController.getOrderStatusById);

// POST create new order status
router.post('/', orderStatusController.createOrderStatus);

// PUT update order status by ID
router.put('/:id', orderStatusController.updateOrderStatus);

// DELETE order status by ID
router.delete('/:id', orderStatusController.deleteOrderStatus);

module.exports = router;