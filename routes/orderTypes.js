const express = require('express');
const orderTypeController = require('../controllers/orderTypeController');
const { getTempTenantId } = require('../middleware/tempTenantMiddleware'); // <--- IMPORT the tenant middleware

const router = express.Router();

// Get all order types
router.get('/', getTempTenantId, orderTypeController.getAllOrderTypes); // Added getTempTenantId

// Create a new order type
router.post('/', getTempTenantId, orderTypeController.createOrderType); // Added getTempTenantId

// Get a single order type by ID
router.get('/:id', getTempTenantId, orderTypeController.getOrderTypeById); // Added getTempTenantId

// Update an order type by ID
router.put('/:id', getTempTenantId, orderTypeController.updateOrderType); // Added getTempTenantId

// Delete an order type by ID
router.delete('/:id', getTempTenantId, orderTypeController.deleteOrderType); // Added getTempTenantId

module.exports = router;