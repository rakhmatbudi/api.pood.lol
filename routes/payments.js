const express = require('express');
const paymentController = require('../controllers/paymentController');
const { getTempTenantId } = require('../middleware/tempTenantMiddleware'); // <--- IMPORT the tenant middleware
// You might add validation middleware for payment requests here

const router = express.Router();

// Route for processing new payment
router.post('/', getTempTenantId, paymentController.processPayment); // Added getTempTenantId
// Expected request body for processPayment:
// {
//    "order_id": 5,      // The ID of the order being paid for
//    "amount": 50000,    // The amount paid
//    "payment_mode": 1, // The method of payment
//    "transaction_id": null, // Optional: Transaction ID for external systems
//    "discount_id": null, // Optional: ID of the discount applied
//    "promo_id": null      // Optional: ID of the specific promo applied
// }

// NEW Route for calculating checkout bill without processing payment
router.post('/checkout/:order_id', getTempTenantId, paymentController.checkout); // Added getTempTenantId
// Expected request body for checkout (optional for discount/promo):
// {
//    "discount_id": null, // Optional: ID of a discount to apply for calculation
//    "promo_id": null      // Optional: ID of a specific promo to apply for calculation
// }
// The order_id will be taken from the URL parameter.

// Route for getting all payments grouped by session
router.get('/grouped/sessions/details', getTempTenantId, paymentController.getAllPaymentsWithOrderItemsGroupedBySession); // Added getTempTenantId

// Route for getting payments by session and mode
router.get('/session/:cashier_session_id/mode/:payment_mode_id', getTempTenantId, paymentController.getPaymentsBySessionAndMode); // Added getTempTenantId


module.exports = router;