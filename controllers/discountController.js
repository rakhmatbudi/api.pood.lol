// controllers/discountController.js
const Discount = require('../models/Discount');

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

exports.getAllDiscounts = async (req, res) => {
    const tenant = gettenant(req, res);
    if (!tenant) return; // Stop if tenant is missing

    try {
        // Pass tenant to retrieve discounts specific to this tenant
        const discounts = await Discount.findAll(tenant);
        res.status(200).json({
            status: 'success',
            count: discounts.length,
            data: discounts,
        });
    } catch (err) {
        console.error('Error getting all discounts:', err);
        res.status(500).json({
            status: 'error',
            message: 'Failed to retrieve discounts',
        });
    }
};

exports.getDiscountById = async (req, res) => {
    const tenant = gettenant(req, res);
    if (!tenant) return; // Stop if tenant is missing

    try {
        // Pass tenant to find the discount belonging to this tenant
        const discount = await Discount.findById(req.params.id, tenant);
        if (!discount) {
            // Be specific: not found OR does not belong to this tenant
            return res.status(404).json({
                status: 'error',
                message: 'Discount not found or does not belong to this tenant',
            });
        }
        res.status(200).json({
            status: 'success',
            data: discount,
        });
    } catch (err) {
        console.error(`Error getting discount ${req.params.id}:`, err);
        res.status(500).json({
            status: 'error',
            message: 'Failed to retrieve discount',
        });
    }
};

exports.createDiscount = async (req, res) => {
    const tenant = gettenant(req, res);
    if (!tenant) return; // Stop if tenant is missing

    try {
        // Add tenant to the discount data before creating
        const discountData = { ...req.body, tenant: tenant };
        const newDiscount = await Discount.create(discountData);
        res.status(201).json({
            status: 'success',
            data: newDiscount,
        });
    } catch (err) {
        console.error('Error creating discount:', err);
        res.status(500).json({
            status: 'error',
            message: 'Failed to create discount',
        });
    }
};

exports.updateDiscount = async (req, res) => {
    const tenant = gettenant(req, res);
    if (!tenant) return; // Stop if tenant is missing

    try {
        // Pass tenant to update the discount belonging to this tenant
        const updatedDiscount = await Discount.update(req.params.id, req.body, tenant);
        if (!updatedDiscount) {
            // Be specific: not found OR does not belong to this tenant
            return res.status(404).json({
                status: 'error',
                message: 'Discount not found or does not belong to this tenant',
            });
        }
        res.status(200).json({
            status: 'success',
            data: updatedDiscount,
        });
    } catch (err) {
        console.error(`Error updating discount ${req.params.id}:`, err);
        res.status(500).json({
            status: 'error',
            message: 'Failed to update discount',
        });
    }
};

exports.deleteDiscount = async (req, res) => {
    const tenant = gettenant(req, res);
    if (!tenant) return; // Stop if tenant is missing

    try {
        // Pass tenant to delete the discount belonging to this tenant
        const deletedDiscount = await Discount.delete(req.params.id, tenant);
        if (!deletedDiscount) {
            // Be specific: not found OR does not belong to this tenant
            return res.status(404).json({
                status: 'error',
                message: 'Discount not found or does not belong to this tenant',
            });
        }
        res.status(200).json({
            status: 'success',
            message: 'Discount deleted successfully',
        });
    } catch (err) {
        console.error(`Error deleting discount ${req.params.id}:`, err);
        res.status(500).json({
            status: 'error',
            message: 'Failed to delete discount',
        });
    }
};