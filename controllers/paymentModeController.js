// controllers/paymentModeController.js
const PaymentMode = require('../models/PaymentMode');

exports.getAllPaymentModes = async (req, res) => {
  try {
    const paymentModes = await PaymentMode.findAll();
    res.status(200).json({ status: 'success', data: paymentModes });
  } catch (error) {
    console.error('Error fetching payment modes:', error);
    res.status(500).json({ status: 'error', message: 'Failed to fetch payment modes' });
  }
};

exports.getPaymentModeById = async (req, res) => {
  const { id } = req.params;
  try {
    const paymentMode = await PaymentMode.findById(id);
    if (paymentMode) {
      res.status(200).json({ status: 'success', data: paymentMode });
    } else {
      res.status(404).json({ status: 'error', message: 'Payment mode not found' });
    }
  } catch (error) {
    console.error('Error fetching payment mode by ID:', error);
    res.status(500).json({ status: 'error', message: 'Failed to fetch payment mode' });
  }
};

exports.createPaymentMode = async (req, res) => {
  try {
    const newPaymentMode = await PaymentMode.create(req.body);
    res.status(201).json({ status: 'success', data: newPaymentMode });
  } catch (error) {
    console.error('Error creating payment mode:', error);
    res.status(500).json({ status: 'error', message: 'Failed to create payment mode' });
  }
};

exports.updatePaymentMode = async (req, res) => {
  const { id } = req.params;
  try {
    const updatedPaymentMode = await PaymentMode.update(id, req.body);
    if (updatedPaymentMode) {
      res.status(200).json({ status: 'success', data: updatedPaymentMode });
    } else {
      res.status(404).json({ status: 'error', message: 'Payment mode not found' });
    }
  } catch (error) {
    console.error('Error updating payment mode:', error);
    res.status(500).json({ status: 'error', message: 'Failed to update payment mode' });
  }
};

exports.deletePaymentMode = async (req, res) => {
  const { id } = req.params;
  try {
    const deletedPaymentMode = await PaymentMode.delete(id);
    if (deletedPaymentMode) {
      res.status(200).json({ status: 'success', data: { message: 'Payment mode deleted', paymentMode: deletedPaymentMode } });
    } else {
      res.status(404).json({ status: 'error', message: 'Payment mode not found' });
    }
  } catch (error) {
    console.error('Error deleting payment mode:', error);
    res.status(500).json({ status: 'error', message: 'Failed to delete payment mode' });
  }
};

module.exports = exports;