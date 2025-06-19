// controllers/paymentModeController.js
const PaymentMode = require('../models/PaymentMode');

/**
 * Helper to ensure tenant is present
 */
const gettenant = (req, res) => {
    const tenant = req.tenant; // Assuming tenant is attached by middleware
    if (!tenant) {
        res.status(400).json({ status: 'error', message: 'Tenant ID is required.' });
        return null;
    }
    return tenant;
};

exports.getAllPaymentModes = async (req, res) => {
    const tenant = gettenant(req, res);
    if (!tenant) return; // Stop if tenant is missing

    try {
        // Pass tenant to retrieve payment modes specific to this tenant
        const paymentModes = await PaymentMode.findAll(tenant);
        res.status(200).json({ status: 'success', data: paymentModes });
    } catch (error) {
        console.error('Error fetching payment modes:', error);
        res.status(500).json({ status: 'error', message: 'Failed to fetch payment modes' });
    }
};

exports.getPaymentModeById = async (req, res) => {
    const tenant = gettenant(req, res);
    if (!tenant) return; // Stop if tenant is missing

    const { id } = req.params;
    try {
        // Pass tenant to find the payment mode belonging to this tenant
        const paymentMode = await PaymentMode.findById(id, tenant);
        if (paymentMode) {
            res.status(200).json({ status: 'success', data: paymentMode });
        } else {
            // Be specific: not found OR does not belong to this tenant
            res.status(404).json({ status: 'error', message: 'Payment mode not found or does not belong to this tenant' });
        }
    } catch (error) {
        console.error('Error fetching payment mode by ID:', error);
        res.status(500).json({ status: 'error', message: 'Failed to fetch payment mode' });
    }
};

exports.createPaymentMode = async (req, res) => {
    const tenant = gettenant(req, res);
    if (!tenant) return; // Stop if tenant is missing

    try {
        // Add tenant to the payment mode data before creating
        const paymentModeData = { ...req.body, tenant: tenant };
        const newPaymentMode = await PaymentMode.create(paymentModeData);
        res.status(201).json({ status: 'success', data: newPaymentMode });
    } catch (error) {
        console.error('Error creating payment mode:', error);
        res.status(500).json({ status: 'error', message: 'Failed to create payment mode' });
    }
};

exports.updatePaymentMode = async (req, res) => {
    const tenant = gettenant(req, res);
    if (!tenant) return; // Stop if tenant is missing

    const { id } = req.params;
    try {
        // Pass tenant to update the payment mode belonging to this tenant
        const updatedPaymentMode = await PaymentMode.update(id, req.body, tenant);
        if (updatedPaymentMode) {
            res.status(200).json({ status: 'success', data: updatedPaymentMode });
        } else {
            // Be specific: not found OR does not belong to this tenant
            res.status(404).json({ status: 'error', message: 'Payment mode not found or does not belong to this tenant' });
        }
    } catch (error) {
        console.error('Error updating payment mode:', error);
        res.status(500).json({ status: 'error', message: 'Failed to update payment mode' });
    }
};

exports.deletePaymentMode = async (req, res) => {
    const tenant = gettenant(req, res);
    if (!tenant) return; // Stop if tenant is missing

    const { id } = req.params;
    try {
        // Pass tenant to delete the payment mode belonging to this tenant
        const deletedPaymentMode = await PaymentMode.delete(id, tenant);
        if (deletedPaymentMode) {
            res.status(200).json({ status: 'success', data: { message: 'Payment mode deleted', paymentMode: deletedPaymentMode } });
        } else {
            // Be specific: not found OR does not belong to this tenant
            res.status(404).json({ status: 'error', message: 'Payment mode not found or does not belong to this tenant' });
        }
    } catch (error) {
        console.error('Error deleting payment mode:', error);
        res.status(500).json({ status: 'error', message: 'Failed to delete payment mode' });
    }
};

// module.exports = exports; // This line is generally not needed if you are using named exports