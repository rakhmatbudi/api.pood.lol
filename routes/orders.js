// routes/orders.js

const express = require('express');
const orderController = require('../controllers/orderController');
const { validateOrder, validateUpdateOrder } = require('../middleware/validate');
const authMiddleware = require('../middleware/authMiddleware'); // Essential for authentication
const tenantResolverMiddleware = require('../middleware/tenantResolverMiddleware');
const Order = require('../models/Order'); // Import the Order model here to directly call its method

const router = express.Router();

// Apply authentication and tenant resolution middleware to ALL subsequent routes in this router.
// The (req, res, next) => { next(); } is redundant and removed.
router.use(authMiddleware, tenantResolverMiddleware);

// All routes below this point will automatically have authMiddleware and tenantResolverMiddleware applied.

// Route for getting all orders (now protected and tenant-scoped by global middleware)
router.get('/', orderController.getAllOrders);

// Route for creating new ORDER
router.post('/', validateOrder, orderController.createOrder);
// Example usage:
// {
//    "table_number": "7",
//    "server_id": 2,
//    "customer_id": 2,
//    "cashier_session_id": 16,
//    "order_type_id": 1
// }

// Existing route for generic status update
router.put('/:id/status', orderController.updateOrderStatus);
// Example usage: PUT http://localhost:3000/api/orders/5/status
// Body: { "status": "cancelled" }

// NEW: Route to cancel an order, explicitly setting its order_status to 3 ('cancelled')
router.put('/:id/cancel', orderController.cancelOrder);

router.get('/sessions/:sessionId', orderController.getOrdersBySessionId);
router.get('/open/sessions/:cashier_session_id', orderController.getOpenOrdersBySession);
router.get('/status/:status', orderController.getOrdersByStatus);
router.get('/:id', orderController.getOrderById);
router.put('/:id', validateUpdateOrder, orderController.updateOrder);
router.delete('/:id', orderController.deleteOrder);

// Route for POST adding order items to a specific order
router.post('/:orderId/items', orderController.addOrderItem);
// usage: POST http://localhost:3000/api/orders/5/items
// {
//    "menu_item_id": 10,
//    "variant_id": null,
//    "quantity": 2,
//    "unit_price": 7.99,
//    "total_price": 15.98,
//    "notes": "Extra sauce",
//    "status": "new",
//    "kitchen_printed": false
// }

// Route for PUT updating an order item's status
router.put('/:orderId/items/:itemId/status', orderController.updateOrderItemStatus);

// Route to get all orders grouped by cashier session, sorted by time descending
router.get('/grouped/sessions/desc', orderController.getAllOrdersGroupedBySessionDescending);


module.exports = router;