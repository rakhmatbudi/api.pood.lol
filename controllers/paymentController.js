// controllers/paymentController.js
const Payment = require('../models/Payment');
const Order = require('../models/Order'); // You might want to update the order status

exports.processPayment = async (req, res) => {
  const { order_id, amount, payment_mode, transaction_id } = req.body;

  try {
    // Check if the order exists
    const order = await Order.findById(order_id);
    if (!order) {
      return res.status(404).json({ status: 'error', message: 'Order not found' });
    }

    // Basic validation
    if (!amount || amount <= 0) {
      return res.status(400).json({ status: 'error', message: 'Payment amount is invalid' });
    }
    if (!payment_mode) {
      return res.status(400).json({ status: 'error', message: 'Payment mode is required' });
    }

    const newPayment = await Payment.create({ order_id, amount, payment_mode, transaction_id });

    // Calculate the total amount paid for this order so far
    const payments = await Payment.findAllByOrderId(order_id); // Assuming you have this model method
    const totalPaidAmount = payments.reduce((sum, payment) => sum + parseFloat(payment.amount), 0);

    let updatedOrder;
    if (totalPaidAmount >= parseFloat(order.total_amount)) {
      updatedOrder = await Order.update(order_id, { status: 'closed', is_open: false });
    } else if (totalPaidAmount > 0) {
      updatedOrder = await Order.update(order_id, { status: 'partially paid', is_open: true }); // Keep it open for more payments
    } else {
      // This case shouldn't ideally happen after the first payment,
      // but handle it for completeness (e.g., first payment)
      updatedOrder = await Order.update(order_id, { status: 'open', is_open: true });
    }

    res.status(201).json({ status: 'success', data: { payment: newPayment, order: updatedOrder } });

  } catch (error) {
    console.error('Error processing payment:', error);
    res.status(500).json({ status: 'error', message: 'Failed to process payment' });
  }
};

exports.getAllPaymentsWithOrderItemsGroupedBySession = async (req, res) => {
  try {
    const groupedPayments = await Payment.findAllWithOrderItemsGroupedBySession();
    res.status(200).json({ status: 'success', data: groupedPayments });
  } catch (error) {
    console.error('Error fetching payments with order items grouped by session:', error);
    res.status(500).json({ status: 'error', message: 'Failed to fetch payments with order items' });
  }
};

exports.getPaymentsBySessionAndMode = async (req, res) => {
  const { cashier_session_id, payment_mode_id } = req.params;

  try {
    if (!cashier_session_id || !payment_mode_id) {
      return res.status(400).json({
        status: 'error',
        message: 'Cashier Session ID and Payment Mode ID are required',
      });
    }

    const payments = await Payment.findAllBySessionAndPaymentMode(
      cashier_session_id,
      payment_mode_id
    );

    res.status(200).json({ status: 'success', data: payments });
  } catch (error) {
    console.error('Error fetching payments by session and mode:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch payments by session and mode',
    });
  }
};

module.exports = exports;