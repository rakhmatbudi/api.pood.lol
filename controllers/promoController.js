// controllers/promoController.js
const Promo = require('../models/Promo');

// Get all promos
exports.getAllPromos = async (req, res) => {
    const tenantId = req.tenantId; // Assuming tenantId is attached by middleware

    if (!tenantId) {
        return res.status(400).json({ status: 'error', message: 'Tenant ID is required.' });
    }

    try {
        const promos = await Promo.findAll(tenantId); // Pass tenantId to the model method
        res.status(200).json({
            status: 'success',
            data: promos
        });
    } catch (error) {
        console.error('Error fetching all promos:', error);
        res.status(500).json({
            status: 'error',
            message: 'Failed to retrieve promos',
            details: error.message
        });
    }
};

// Get promo by ID
exports.getPromoById = async (req, res) => {
    const { id } = req.params;
    const tenantId = req.tenantId; // Assuming tenantId is attached by middleware

    if (!tenantId) {
        return res.status(400).json({ status: 'error', message: 'Tenant ID is required.' });
    }

    try {
        const promo = await Promo.findById(id, tenantId); // Pass tenantId to the model method
        if (!promo) {
            return res.status(404).json({
                status: 'error',
                message: 'Promo not found or does not belong to this tenant' // More specific message
            });
        }
        res.status(200).json({
            status: 'success',
            data: promo
        });
    } catch (error) {
        console.error(`Error fetching promo ${req.params.id}:`, error);
        res.status(500).json({
            status: 'error',
            message: 'Failed to retrieve promo',
            details: error.message
        });
    }
};

// Create a new promo
exports.createPromo = async (req, res) => {
    const tenantId = req.tenantId; // Assuming tenantId is attached by middleware

    if (!tenantId) {
        return res.status(400).json({ status: 'error', message: 'Tenant ID is required.' });
    }

    try {
        // Add tenantId to the promo data before creating
        const promoData = { ...req.body, tenant_id: tenantId };
        const newPromo = await Promo.create(promoData); // Pass the combined data
        res.status(201).json({
            status: 'success',
            message: 'Promo created successfully',
            data: newPromo
        });
    } catch (error) {
        console.error('Error creating promo:', error);
        res.status(500).json({
            status: 'error',
            message: 'Failed to create promo',
            details: error.message
        });
    }
};

// Update an existing promo
exports.updatePromo = async (req, res) => {
    const { id } = req.params;
    const tenantId = req.tenantId; // Assuming tenantId is attached by middleware

    if (!tenantId) {
        return res.status(400).json({ status: 'error', message: 'Tenant ID is required.' });
    }

    try {
        // Include tenantId in the update operation to ensure tenant scope
        const updatedPromo = await Promo.update(id, req.body, tenantId); // Pass tenantId to the model method
        if (!updatedPromo) {
            return res.status(404).json({
                status: 'error',
                message: 'Promo not found or does not belong to this tenant' // More specific message
            });
        }
        res.status(200).json({
            status: 'success',
            message: 'Promo updated successfully',
            data: updatedPromo
        });
    } catch (error) {
        console.error(`Error updating promo ${req.params.id}:`, error);
        res.status(500).json({
            status: 'error',
            message: 'Failed to update promo',
            details: error.message
        });
    }
};

// Delete a promo
exports.deletePromo = async (req, res) => {
    const { id } = req.params;
    const tenantId = req.tenantId; // Assuming tenantId is attached by middleware

    if (!tenantId) {
        return res.status(400).json({ status: 'error', message: 'Tenant ID is required.' });
    }

    try {
        const deletedPromo = await Promo.delete(id, tenantId); // Pass tenantId to the model method
        if (!deletedPromo) {
            return res.status(404).json({
                status: 'error',
                message: 'Promo not found or does not belong to this tenant' // More specific message
            });
        }
        res.status(200).json({
            status: 'success',
            message: 'Promo deleted successfully',
            data: deletedPromo
        });
    } catch (error) {
        console.error(`Error deleting promo ${req.params.id}:`, error);
        res.status(500).json({
            status: 'error',
            message: 'Failed to delete promo',
            details: error.message
        });
    }
};