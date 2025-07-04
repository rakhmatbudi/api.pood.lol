// controllers/expenseCategoryController.js
const ExpenseCategory = require('../models/ExpenseCategory'); // Import the ExpenseCategory model

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
 * Controller function to get all expense categories for the current tenant.
 * @param {Object} req - The Express request object.
 * @param {Object} res - The Express response object.
 */
exports.getAllExpenseCategories = async (req, res) => {
    const tenant = getTenant(req, res); // Get and validate tenant ID.
    if (!tenant) return; // Stop execution if tenant is missing.

    try {
        // Call the static `findAll` method from the ExpenseCategory model, passing the tenant ID.
        const expenseCategories = await ExpenseCategory.findAll(tenant);
        // Send a 200 OK response with the list of expense categories.
        res.status(200).json({
            status: 'success',
            count: expenseCategories.length, // Include the count of returned entries.
            data: expenseCategories,
        });
    } catch (err) {
        // Log the error and send a 500 Internal Server Error response.
        console.error('Error getting all expense categories:', err);
        res.status(500).json({
            status: 'error',
            message: 'Failed to retrieve expense categories',
        });
    }
};

/**
 * Controller function to get a single expense category by its ID for the current tenant.
 * @param {Object} req - The Express request object.
 * @param {Object} res - The Express response object.
 */
exports.getExpenseCategoryById = async (req, res) => {
    const tenant = getTenant(req, res); // Get and validate tenant ID.
    if (!tenant) return; // Stop execution if tenant is missing.

    try {
        // Call the static `findById` method, passing the category ID from params and the tenant ID.
        const expenseCategory = await ExpenseCategory.findById(req.params.id, tenant);
        if (!expenseCategory) {
            // If no category is found (either by ID or for the specific tenant), send a 404 Not Found error.
            return res.status(404).json({
                status: 'error',
                message: 'Expense category not found or does not belong to this tenant',
            });
        }
        // Send a 200 OK response with the found expense category.
        res.status(200).json({
            status: 'success',
            data: expenseCategory,
        });
    } catch (err) {
        // Log the error and send a 500 Internal Server Error response.
        console.error(`Error getting expense category ${req.params.id}:`, err);
        res.status(500).json({
            status: 'error',
            message: 'Failed to retrieve expense category',
        });
    }
};

/**
 * Controller function to create a new expense category for the current tenant.
 * @param {Object} req - The Express request object.
 * @param {Object} res - The Express response object.
 */
exports.createExpenseCategory = async (req, res) => {
    const tenant = getTenant(req, res); // Get and validate tenant ID.
    if (!tenant) return; // Stop execution if tenant is missing.

    try {
        // Combine the request body data with the tenant ID.
        const categoryData = { ...req.body, tenant: tenant }; // Add tenant to the data
        // Call the static `create` method from the ExpenseCategory model.
        const newExpenseCategory = await ExpenseCategory.create(categoryData);
        // Send a 201 Created response with the newly created expense category.
        res.status(201).json({
            status: 'success',
            data: newExpenseCategory,
        });
    } catch (err) {
        // Log the error and send a 500 Internal Server Error response.
        console.error('Error creating expense category:', err);
        res.status(500).json({
            status: 'error',
            message: 'Failed to create expense category',
        });
    }
};

/**
 * Controller function to update an existing expense category for the current tenant.
 * @param {Object} req - The Express request object.
 * @param {Object} res - The Express response object.
 */
exports.updateExpenseCategory = async (req, res) => {
    const tenant = getTenant(req, res); // Get and validate tenant ID.
    if (!tenant) return; // Stop execution if tenant is missing.

    try {
        // Call the static `update` method, passing the category ID, request body, and tenant ID.
        const updatedExpenseCategory = await ExpenseCategory.update(req.params.id, req.body, tenant);
        if (!updatedExpenseCategory) {
            // If no category is found for update (either by ID or for the specific tenant), send a 404 Not Found error.
            return res.status(404).json({
                status: 'error',
                message: 'Expense category not found or does not belong to this tenant',
            });
        }
        // Send a 200 OK response with the updated expense category.
        res.status(200).json({
            status: 'success',
            data: updatedExpenseCategory,
        });
    } catch (err) {
        // Log the error and send a 500 Internal Server Error response.
        console.error(`Error updating expense category ${req.params.id}:`, err);
        res.status(500).json({
            status: 'error',
            message: 'Failed to update expense category',
        });
    }
};

/**
 * Controller function to delete an expense category for the current tenant.
 * @param {Object} req - The Express request object.
 * @param {Object} res - The Express response object.
 */
exports.deleteExpenseCategory = async (req, res) => {
    const tenant = getTenant(req, res); // Get and validate tenant ID.
    if (!tenant) return; // Stop execution if tenant is missing.

    try {
        // Call the static `delete` method, passing the category ID and tenant ID.
        const deletedExpenseCategory = await ExpenseCategory.delete(req.params.id, tenant);
        if (!deletedExpenseCategory) {
            // If no category is found for deletion (either by ID or for the specific tenant), send a 404 Not Found error.
            return res.status(404).json({
                status: 'error',
                message: 'Expense category not found or does not belong to this tenant',
            });
        }
        // Send a 200 OK response indicating successful deletion.
        res.status(200).json({
            status: 'success',
            message: 'Expense category deleted successfully',
        });
    } catch (err) {
        // Log the error and send a 500 Internal Server Error response.
        console.error(`Error deleting expense category ${req.params.id}:`, err);
        res.status(500).json({
            status: 'error',
            message: 'Failed to delete expense category',
        });
    }
};
