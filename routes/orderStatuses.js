// routes/orderStatuses.js
const express = require('express');
const orderStatusController = require('../controllers/orderStatusController');
const { getTempTenantId } = require('../middleware/tempTenantMiddleware'); // <--- IMPORT the tenant middleware

const router = express.Router();

// GET all order statuses
router.get('/', getTempTenantId, orderStatusController.getAllOrderStatuses); // Added getTempTenantId

// GET order status by ID
router.get('/:id', getTempTenantId, orderStatusController.getOrderStatusById); // Added getTempTenantId

// POST create new order status
router.post('/', getTempTenantId, orderStatusController.createOrderStatus); // Added getTempTenantId

// PUT update order status by ID
router.put('/:id', getTempTenantId, orderStatusController.updateOrderStatus); // Added getTempTenantId

// DELETE order status by ID
router.delete('/:id', getTempTenantId, orderStatusController.deleteOrderStatus); // Added getTempTenantId

module.exports = router;