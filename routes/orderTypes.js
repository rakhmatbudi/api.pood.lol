const express = require('express');
const orderTypeController = require('../controllers/orderTypeController');

const router = express.Router();

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