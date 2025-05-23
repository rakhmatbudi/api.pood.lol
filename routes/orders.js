const express = require('express');
const orderController = require('../controllers/orderController');
const { validateOrder, validateUpdateOrder } = require('../middleware/validate');

const router = express.Router();

router.get('/', orderController.getAllOrders);

// Route for creating new ORDER
router.post('/', validateOrder, orderController.createOrder);
//{
//  "table_number": "7",
//  "server_id": 2,
//  "customer_id": 2,
//  "cashier_session_id": 16
//}

router.put('/:id/status', orderController.updateOrderStatus);
// Example usage: PUT http://localhost:3000/api/orders/5/status
// Body: { "status": "cancelled" }

router.get('/open/sessions/:cashier_session_id', orderController.getOpenOrdersBySession);
router.get('/status/:status', orderController.getOrdersByStatus);
router.get('/:id', orderController.getOrderById);
router.put('/:id', validateUpdateOrder, orderController.updateOrder);
router.delete('/:id', orderController.deleteOrder);

// Route for POST adding order items to a specific order
router.post('/:orderId/items', orderController.addOrderItem);
// usage: POST http://localhost:3000/api/orders/5/items
// {
//  "menu_item_id": 10,     // The ID of the menu item being ordered
//  "variant_id": null,     // Optional: The ID of the variant (e.g., size)
//  "quantity": 2,          // The number of units of this item
//  "unit_price": 7.99,     // The price per unit
//  "total_price": 15.98,   // The total price for this item (quantity * unit_price)
//  "notes": "Extra sauce", // Any special instructions for this item
//  "status": "new",        // The initial status of the item (optional, defaults to 'new')
//  "kitchen_printed": false // Whether it has been printed in the kitchen (optional, defaults to false)
//}

// Route for PUT updating an order item's status
router.put('/:orderId/items/:itemId/status', orderController.updateOrderItemStatus);

// Route to get all orders grouped by cashier session, sorted by time descending
router.get('/grouped/sessions/desc', orderController.getAllOrdersGroupedBySessionDescending);


module.exports = router;