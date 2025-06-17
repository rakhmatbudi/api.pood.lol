// routes/orders.js

const express = require('express');
const orderController = require('../controllers/orderController');
const { validateOrder, validateUpdateOrder } = require('../middleware/validate');
const { getTempTenantId } = require('../middleware/tempTenantMiddleware'); // Import the new middleware
const Order = require('../models/Order'); // Import the Order model here to directly call its method

const router = express.Router();

router.get('/', getTempTenantId, orderController.getAllOrders);

// Route for creating new ORDER
router.post('/', getTempTenantId, validateOrder, orderController.createOrder);
// Example usage:
// {
//    "table_number": "7",
//    "server_id": 2,
//    "customer_id": 2,
//    "cashier_session_id": 16,
//    "order_type_id": 1
// }

// Existing route for generic status update
router.put('/:id/status', getTempTenantId, orderController.updateOrderStatus);
// Example usage: PUT http://localhost:3000/api/orders/5/status
// Body: { "status": "cancelled" }

// NEW: Route to cancel an order, explicitly setting its order_status to 3 ('cancelled')
// This bypasses the need to send "status": "cancelled" in the body,
// making the intent of the endpoint clearer.
router.put('/:id/cancel', getTempTenantId, orderController.cancelOrder); 
router.get('/sessions/:sessionId', getTempTenantId, orderController.getOrdersBySessionId);
router.get('/open/sessions/:cashier_session_id', getTempTenantId, orderController.getOpenOrdersBySession);
router.get('/status/:status', getTempTenantId, orderController.getOrdersByStatus);
router.get('/:id', getTempTenantId, orderController.getOrderById);
router.put('/:id', getTempTenantId, validateUpdateOrder, orderController.updateOrder);
router.delete('/:id', getTempTenantId, orderController.deleteOrder);

// Route for POST adding order items to a specific order
router.post('/:orderId/items', getTempTenantId, orderController.addOrderItem);
// usage: POST http://localhost:3000/api/orders/5/items
// {
//    "menu_item_id": 10,       // The ID of the menu item being ordered
//    "variant_id": null,       // Optional: The ID of the variant (e.g., size)
//    "quantity": 2,            // The number of units of this item
//    "unit_price": 7.99,       // The price per unit
//    "total_price": 15.98,     // The total price for this item (quantity * unit_price)
//    "notes": "Extra sauce",   // Any special instructions for this item
//    "status": "new",          // The initial status of the item (optional, defaults to 'new')
//    "kitchen_printed": false  // Whether it has been printed in the kitchen (optional, defaults to false)
// }

// Route for PUT updating an order item's status
router.put('/:orderId/items/:itemId/status', getTempTenantId, orderController.updateOrderItemStatus);

// Route to get all orders grouped by cashier session, sorted by time descending
router.get('/grouped/sessions/desc', getTempTenantId, orderController.getAllOrdersGroupedBySessionDescending);


module.exports = router;