const express = require('express');
const paymentController = require('../controllers/paymentController');
// You might add validation middleware for payment requests here

const router = express.Router();

// Route for processing new payment
router.post('/', paymentController.processPayment);
// Expected request body for processPayment:
// {
//   "order_id": 5,      // The ID of the order being paid for
//   "amount": 50000,    // The amount paid
//   "payment_mode": 1, // The method of payment
//   "transaction_id": null, // Optional: Transaction ID for external systems
//   "discount_id": null, // Optional: ID of the discount applied
//   "promo_id": null     // Optional: ID of the specific promo applied
// }

// NEW Route for calculating checkout bill without processing payment
router.post('/checkout/:order_id', paymentController.checkout);
// Expected request body for checkout (optional for discount/promo):
// {
//   "discount_id": null, // Optional: ID of a discount to apply for calculation
//   "promo_id": null     // Optional: ID of a specific promo to apply for calculation
// }
// The order_id will be taken from the URL parameter.

// Route for getting all payments grouped by session
router.get('/grouped/sessions/details', paymentController.getAllPaymentsWithOrderItemsGroupedBySession);

// Route for getting payments by session and mode
router.get('/session/:cashier_session_id/mode/:payment_mode_id', paymentController.getPaymentsBySessionAndMode);


module.exports = router;
