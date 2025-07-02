// controllers/otherRevenueController.js
const OtherRevenue = require('../models/OtherRevenue'); // Import the OtherRevenue model

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
 * Controller function to get all other revenue entries for the current tenant.
 * @param {Object} req - The Express request object.
 * @param {Object} res - The Express response object.
 */
exports.getAllOtherRevenues = async (req, res) => {
    const tenant = getTenant(req, res); // Get and validate tenant ID.
    if (!tenant) return; // Stop execution if tenant is missing.

    try {
        // Call the static `findAll` method from the OtherRevenue model, passing the tenant ID.
        const otherRevenues = await OtherRevenue.findAll(tenant);
        // Send a 200 OK response with the list of other revenue entries.
        res.status(200).json({
            status: 'success',
            count: otherRevenues.length, // Include the count of returned entries.
            data: otherRevenues,
        });
    } catch (err) {
        // Log the error and send a 500 Internal Server Error response.
        console.error('Error getting all other revenues:', err);
        res.status(500).json({
            status: 'error',
            message: 'Failed to retrieve other revenues',
        });
    }
};

/**
 * Controller function to get a single other revenue entry by its ID for the current tenant.
 * @param {Object} req - The Express request object.
 * @param {Object} res - The Express response object.
 */
exports.getOtherRevenueById = async (req, res) => {
    const tenant = getTenant(req, res); // Get and validate tenant ID.
    if (!tenant) return; // Stop execution if tenant is missing.

    try {
        // Call the static `findById` method, passing the revenue ID from params and the tenant ID.
        const otherRevenue = await OtherRevenue.findById(req.params.id, tenant);
        if (!otherRevenue) {
            // If no entry is found (either by ID or for the specific tenant), send a 404 Not Found error.
            return res.status(404).json({
                status: 'error',
                message: 'Other revenue entry not found or does not belong to this tenant',
            });
        }
        // Send a 200 OK response with the found other revenue entry.
        res.status(200).json({
            status: 'success',
            data: otherRevenue,
        });
    } catch (err) {
        // Log the error and send a 500 Internal Server Error response.
        console.error(`Error getting other revenue ${req.params.id}:`, err);
        res.status(500).json({
            status: 'error',
            message: 'Failed to retrieve other revenue entry',
        });
    }
};

/**
 * Controller function to create a new other revenue entry for the current tenant.
 * @param {Object} req - The Express request object.
 * @param {Object} res - The Express response object.
 */
exports.createOtherRevenue = async (req, res) => {
    const tenant = getTenant(req, res); // Get and validate tenant ID.
    if (!tenant) return; // Stop execution if tenant is missing.

    try {
        // Combine the request body data with the tenant ID.
        const revenueData = { ...req.body, tenant: tenant };
        // Call the static `create` method from the OtherRevenue model.
        const newOtherRevenue = await OtherRevenue.create(revenueData);
        // Send a 201 Created response with the newly created other revenue entry.
        res.status(201).json({
            status: 'success',
            data: newOtherRevenue,
        });
    } catch (err) {
        // Log the error and send a 500 Internal Server Error response.
        console.error('Error creating other revenue:', err);
        res.status(500).json({
            status: 'error',
            message: 'Failed to create other revenue entry',
        });
    }
};

/**
 * Controller function to update an existing other revenue entry for the current tenant.
 * @param {Object} req - The Express request object.
 * @param {Object} res - The Express response object.
 */
exports.updateOtherRevenue = async (req, res) => {
    const tenant = getTenant(req, res); // Get and validate tenant ID.
    if (!tenant) return; // Stop execution if tenant is missing.

    try {
        // Call the static `update` method, passing the revenue ID, request body, and tenant ID.
        const updatedOtherRevenue = await OtherRevenue.update(req.params.id, req.body, tenant);
        if (!updatedOtherRevenue) {
            // If no entry is found for update (either by ID or for the specific tenant), send a 404 Not Found error.
            return res.status(404).json({
                status: 'error',
                message: 'Other revenue entry not found or does not belong to this tenant',
            });
        }
        // Send a 200 OK response with the updated other revenue entry.
        res.status(200).json({
            status: 'success',
            data: updatedOtherRevenue,
        });
    } catch (err) {
        // Log the error and send a 500 Internal Server Error response.
        console.error(`Error updating other revenue ${req.params.id}:`, err);
        res.status(500).json({
            status: 'error',
            message: 'Failed to update other revenue entry',
        });
    }
};

/**
 * Controller function to delete an other revenue entry for the current tenant.
 * @param {Object} req - The Express request object.
 * @param {Object} res - The Express response object.
 */
exports.deleteOtherRevenue = async (req, res) => {
    const tenant = getTenant(req, res); // Get and validate tenant ID.
    if (!tenant) return; // Stop execution if tenant is missing.

    try {
        // Call the static `delete` method, passing the revenue ID and tenant ID.
        const deletedOtherRevenue = await OtherRevenue.delete(req.params.id, tenant);
        if (!deletedOtherRevenue) {
            // If no entry is found for deletion (either by ID or for the specific tenant), send a 404 Not Found error.
            return res.status(404).json({
                status: 'error',
                message: 'Other revenue entry not found or does not belong to this tenant',
            });
        }
        // Send a 200 OK response indicating successful deletion.
        res.status(200).json({
            status: 'success',
            message: 'Other revenue entry deleted successfully',
        });
    } catch (err) {
        // Log the error and send a 500 Internal Server Error response.
        console.error(`Error deleting other revenue ${req.params.id}:`, err);
        res.status(500).json({
            status: 'error',
            message: 'Failed to delete other revenue entry',
        });
    }
};
