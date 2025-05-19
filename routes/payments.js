const express = require('express');
const paymentController = require('../controllers/paymentController');
// You might add validation middleware for payment requests here

const router = express.Router();

// Route for creating new payment
router.post('/', paymentController.processPayment);
//{
//  "order_id": 5,      // The ID of the order being paid for
//  "amount": 50000,    // The amount paid
//  "payment_mode": 1, // The method of payment
//  "transaction_id": null  // Optional: Transaction ID for external systems
//}

router.get('/grouped/sessions/details', paymentController.getAllPaymentsWithOrderItemsGroupedBySession);
router.get('/session/:cashier_session_id/mode/:payment_mode_id', paymentController.getPaymentsBySessionAndMode); // New route


module.exports = router;