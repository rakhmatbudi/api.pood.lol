// controllers/revenueCategoryController.js
const RevenueCategory = require('../models/RevenueCategory'); // Import the RevenueCategory model

/**
 * Helper function to extract and validate the tenant ID from the request.
 * Assumes that a middleware has already attached the tenant ID to `req.tenant`.
 * @param {Object} req - The Express request object.
 * @param {Object} res - The Express response object.
 * @returns {string|null} The tenant ID if present, otherwise null (and sends an error response).
 */
const getTenant = (req, res) => {
    const tenant = req.tenant; // Assuming tenant is attached by middleware
    if (!tenant) {
        // If tenant ID is missing, send a 400 Bad Request error.
        res.status(400).json({ status: 'error', message: 'Tenant ID is required.' });
        return null;
    }
    return tenant; // Return the tenant ID if found.
};

/**
 * Controller function to get all revenue categories for the current tenant.
 * @param {Object} req - The Express request object.
 * @param {Object} res - The Express response object.
 */
exports.getAllRevenueCategories = async (req, res) => {
    const tenant = getTenant(req, res); // Get and validate tenant ID.
    if (!tenant) return; // Stop execution if tenant is missing.

    try {
        // Call the static `findAll` method from the RevenueCategory model, passing the tenant ID.
        const revenueCategories = await RevenueCategory.findAll(tenant);
        // Send a 200 OK response with the list of revenue categories.
        res.status(200).json({
            status: 'success',
            count: revenueCategories.length, // Include the count of returned entries.
            data: revenueCategories,
        });
    } catch (err) {
        // Log the error and send a 500 Internal Server Error response.
        console.error('Error getting all revenue categories:', err);
        res.status(500).json({
            status: 'error',
            message: 'Failed to retrieve revenue categories',
        });
    }
};

/**
 * Controller function to get a single revenue category by its ID for the current tenant.
 * @param {Object} req - The Express request object.
 * @param {Object} res - The Express response object.
 */
exports.getRevenueCategoryById = async (req, res) => {
    const tenant = getTenant(req, res); // Get and validate tenant ID.
    if (!tenant) return; // Stop execution if tenant is missing.

    try {
        // Call the static `findById` method, passing the category ID from params and the tenant ID.
        const revenueCategory = await RevenueCategory.findById(req.params.id, tenant);
        if (!revenueCategory) {
            // If no category is found (either by ID or for the specific tenant), send a 404 Not Found error.
            return res.status(404).json({
                status: 'error',
                message: 'Revenue category not found or does not belong to this tenant',
            });
        }
        // Send a 200 OK response with the found revenue category.
        res.status(200).json({
            status: 'success',
            data: revenueCategory,
        });
    } catch (err) {
        // Log the error and send a 500 Internal Server Error response.
        console.error(`Error getting revenue category ${req.params.id}:`, err);
        res.status(500).json({
            status: 'error',
            message: 'Failed to retrieve revenue category',
        });
    }
};

/**
 * Controller function to create a new revenue category for the current tenant.
 * @param {Object} req - The Express request object.
 * @param {Object} res - The Express response object.
 */
exports.createRevenueCategory = async (req, res) => {
    const tenant = getTenant(req, res); // Get and validate tenant ID.
    if (!tenant) return; // Stop execution if tenant is missing.

    try {
        // Combine the request body data with the tenant ID.
        const categoryData = { ...req.body, tenant: tenant }; // Add tenant to the data
        // Call the static `create` method from the RevenueCategory model.
        const newRevenueCategory = await RevenueCategory.create(categoryData);
        // Send a 201 Created response with the newly created revenue category.
        res.status(201).json({
            status: 'success',
            data: newRevenueCategory,
        });
    } catch (err) {
        // Log the error and send a 500 Internal Server Error response.
        console.error('Error creating revenue category:', err);
        res.status(500).json({
            status: 'error',
            message: 'Failed to create revenue category',
        });
    }
};

/**
 * Controller function to update an existing revenue category for the current tenant.
 * @param {Object} req - The Express request object.
 * @param {Object} res - The Express response object.
 */
exports.updateRevenueCategory = async (req, res) => {
    const tenant = getTenant(req, res); // Get and validate tenant ID.
    if (!tenant) return; // Stop execution if tenant is missing.

    try {
        // Call the static `update` method, passing the category ID, request body, and tenant ID.
        const updatedRevenueCategory = await RevenueCategory.update(req.params.id, req.body, tenant);
        if (!updatedRevenueCategory) {
            // If no category is found for update (either by ID or for the specific tenant), send a 404 Not Found error.
            return res.status(404).json({
                status: 'error',
                message: 'Revenue category not found or does not belong to this tenant',
            });
        }
        // Send a 200 OK response with the updated revenue category.
        res.status(200).json({
            status: 'success',
            data: updatedRevenueCategory,
        });
    } catch (err) {
        // Log the error and send a 500 Internal Server Error response.
        console.error(`Error updating revenue category ${req.params.id}:`, err);
        res.status(500).json({
            status: 'error',
            message: 'Failed to update revenue category',
        });
    }
};

/**
 * Controller function to delete a revenue category for the current tenant.
 * @param {Object} req - The Express request object.
 * @param {Object} res - The Express response object.
 */
exports.deleteRevenueCategory = async (req, res) => {
    const tenant = getTenant(req, res); // Get and validate tenant ID.
    if (!tenant) return; // Stop execution if tenant is missing.

    try {
        // Call the static `delete` method, passing the category ID and tenant ID.
        const deletedRevenueCategory = await RevenueCategory.delete(req.params.id, tenant);
        if (!deletedRevenueCategory) {
            // If no category is found for deletion (either by ID or for the specific tenant), send a 404 Not Found error.
            return res.status(404).json({
                status: 'error',
                message: 'Revenue category not found or does not belong to this tenant',
            });
        }
        // Send a 200 OK response indicating successful deletion.
        res.status(200).json({
            status: 'success',
            message: 'Revenue category deleted successfully',
        });
    } catch (err) {
        // Log the error and send a 500 Internal Server Error response.
        console.error(`Error deleting revenue category ${req.params.id}:`, err);
        res.status(500).json({
            status: 'error',
            message: 'Failed to delete revenue category',
        });
    }
};
