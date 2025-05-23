// routes/orderStatuses.js
const express = require('express');
const orderStatusController = require('../controllers/orderStatusController');

const router = express.Router();

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