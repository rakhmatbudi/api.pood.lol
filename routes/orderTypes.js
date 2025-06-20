const express = require('express');
const orderTypeController = require('../controllers/orderTypeController');
const authMiddleware = require('../middleware/authMiddleware'); // Essential for authentication
const tenantResolverMiddleware = require('../middleware/tenantResolverMiddleware');

const router = express.Router();

// Apply authentication and tenant resolution middleware to ALL subsequent routes in this router.
router.use(authMiddleware, tenantResolverMiddleware);

// All routes below this point will automatically have authMiddleware and tenantResolverMiddleware applied.

// Get all order types
router.get('/', orderTypeController.getAllOrderTypes);

// Create a new order type
router.post('/', orderTypeController.createOrderType);

// Get a single order type by ID
router.get('/:id', orderTypeController.getOrderTypeById);

// Update an order type by ID
router.put('/:id', orderTypeController.updateOrderType);

// Delete an order type by ID
router.delete('/:id', orderTypeController.deleteOrderType);

module.exports = router;