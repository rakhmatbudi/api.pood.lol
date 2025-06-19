// controllers/taxController.js

const Tax = require('../models/Tax'); // Import the Tax model

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

exports.getTaxRates = async (req, res) => {
    const tenant = gettenant(req, res);
    if (!tenant) return; // Stop if tenant is missing

    try {
        // Pass tenant to retrieve tax rates specific to this tenant
        const taxes = await Tax.findAll(tenant);
        res.status(200).json({ status: 'success', data: taxes });
    } catch (error) {
        console.error('Error fetching taxes:', error);
        res.status(500).json({
            status: 'error',
            message: 'Failed to fetch taxes',
            error: process.env.NODE_ENV === 'development' ? error.message : {}
        });
    }
};

exports.calculateTax = async (req, res) => {
    const tenant = gettenant(req, res);
    if (!tenant) return; // Stop if tenant is missing

    try {
        const { amount, taxId } = req.body;

        if (amount === undefined || taxId === undefined) {
            return res.status(400).json({
                status: 'fail',
                message: 'Please provide amount and taxId for calculation.'
            });
        }

        // Pass tenant to find the tax rule belonging to this tenant
        const tax = await Tax.findById(taxId, tenant);

        if (!tax) {
            // Be specific: not found OR does not belong to this tenant
            return res.status(404).json({ status: 'fail', message: 'Tax not found or does not belong to this tenant.' });
        }

        const taxAmount = parseFloat((amount * (tax.amount || 0)).toFixed(2));

        res.status(200).json({
            status: 'success',
            data: {
                amount: parseFloat(amount),
                taxRate: tax.amount,
                tax: taxAmount,
                taxDetails: tax
            }
        });
    } catch (error) {
        console.error('Error calculating tax:', error);
        res.status(500).json({
            status: 'error',
            message: 'Failed to calculate tax',
            error: process.env.NODE_ENV === 'development' ? error.message : {}
        });
    }
};

// Note: getTaxRules seems to be a duplicate of getTaxRates.
// You might want to consolidate or rename for clarity if they serve distinct purposes.
exports.getTaxRules = async (req, res) => {
    const tenant = gettenant(req, res);
    if (!tenant) return; // Stop if tenant is missing

    try {
        // Pass tenant to retrieve tax rules specific to this tenant
        const taxes = await Tax.findAll(tenant);
        res.status(200).json({ status: 'success', data: taxes });
    } catch (error) {
        console.error('Error fetching tax rules:', error);
        res.status(500).json({
            status: 'error',
            message: 'Failed to fetch tax rules',
            error: process.env.NODE_ENV === 'development' ? error.message : {}
        });
    }
};

exports.getTaxRuleById = async (req, res) => {
    const tenant = gettenant(req, res);
    if (!tenant) return; // Stop if tenant is missing

    try {
        const { id } = req.params;
        // Pass tenant to find the tax rule belonging to this tenant
        const taxRule = await Tax.findById(id, tenant);

        if (!taxRule) {
            // Be specific: not found OR does not belong to this tenant
            return res.status(404).json({ status: 'fail', message: 'Tax rule not found or does not belong to this tenant' });
        }

        res.status(200).json({ status: 'success', data: taxRule });
    } catch (error) {
        console.error('Error fetching tax rule:', error);
        res.status(500).json({
            status: 'error',
            message: 'Failed to fetch tax rule',
            error: process.env.NODE_ENV === 'development' ? error.message : {}
        });
    }
};

exports.createTaxRule = async (req, res) => {
    const tenant = gettenant(req, res);
    if (!tenant) return; // Stop if tenant is missing

    try {
        // Add tenant_ to the tax rule data before creating
        const taxRuleData = { ...req.body, tenant: tenant };
        const newTaxRule = await Tax.create(taxRuleData);
        res.status(201).json({ status: 'success', data: newTaxRule });
    } catch (error) {
        console.error('Error creating tax rule:', error);
        res.status(500).json({
            status: 'error',
            message: 'Failed to create tax rule',
            error: process.env.NODE_ENV === 'development' ? error.message : {}
        });
    }
};

exports.updateTaxRule = async (req, res) => {
    const tenant = gettenant(req, res);
    if (!tenant) return; // Stop if tenant is missing

    try {
        const { id } = req.params;
        // Pass tenant to update the tax rule belonging to this tenant
        const updatedTaxRule = await Tax.update(id, req.body, tenant);

        if (!updatedTaxRule) {
            // Be specific: not found OR does not belong to this tenant
            return res.status(404).json({ status: 'fail', message: 'Tax rule not found or does not belong to this tenant' });
        }

        res.status(200).json({ status: 'success', data: updatedTaxRule });
    } catch (error) {
        console.error('Error updating tax rule:', error);
        res.status(500).json({
            status: 'error',
            message: 'Failed to update tax rule',
            error: process.env.NODE_ENV === 'development' ? error.message : {}
        });
    }
};

exports.deleteTaxRule = async (req, res) => {
    const tenant = gettenant(req, res);
    if (!tenant) return; // Stop if tenant is missing

    try {
        const { id } = req.params;
        // Pass tenant to delete the tax rule belonging to this tenant
        const deletedTaxRule = await Tax.delete(id, tenant);

        if (!deletedTaxRule) {
            // Be specific: not found OR does not belong to this tenant
            return res.status(404).json({ status: 'fail', message: 'Tax rule not found or does not belong to this tenant' });
        }

        res.status(204).json(); // 204 No Content for successful deletion
    } catch (error) {
        console.error('Error deleting tax rule:', error);
        res.status(500).json({
            status: 'error',
            message: 'Failed to delete tax rule',
            error: process.env.NODE_ENV === 'development' ? error.message : {}
        });
    }
};