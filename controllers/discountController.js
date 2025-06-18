// controllers/discountController.js
const Discount = require('../models/Discount');

/**
 * Helper to ensure tenantId is present
 */
const getTenantId = (req, res) => {
    const tenantId = req.tenantId; // Assuming tenantId is attached by middleware
    if (!tenantId) {
        res.status(400).json({ status: 'error', message: 'Tenant ID is required.' });
        return null;
    }
    return tenantId;
};

exports.getAllDiscounts = async (req, res) => {
    const tenantId = getTenantId(req, res);
    if (!tenantId) return; // Stop if tenantId is missing

    try {
        // Pass tenantId to retrieve discounts specific to this tenant
        const discounts = await Discount.findAll(tenantId);
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
    const tenantId = getTenantId(req, res);
    if (!tenantId) return; // Stop if tenantId is missing

    try {
        // Pass tenantId to find the discount belonging to this tenant
        const discount = await Discount.findById(req.params.id, tenantId);
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
    const tenantId = getTenantId(req, res);
    if (!tenantId) return; // Stop if tenantId is missing

    try {
        // Add tenant_id to the discount data before creating
        const discountData = { ...req.body, tenant_id: tenantId };
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
    const tenantId = getTenantId(req, res);
    if (!tenantId) return; // Stop if tenantId is missing

    try {
        // Pass tenantId to update the discount belonging to this tenant
        const updatedDiscount = await Discount.update(req.params.id, req.body, tenantId);
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
    const tenantId = getTenantId(req, res);
    if (!tenantId) return; // Stop if tenantId is missing

    try {
        // Pass tenantId to delete the discount belonging to this tenant
        const deletedDiscount = await Discount.delete(req.params.id, tenantId);
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