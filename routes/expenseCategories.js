// routes/expenseCategories.js
const express = require('express');
const expenseCategoryController = require('../controllers/expenseCategoryController'); // Import the expense category controller
const authMiddleware = require('../middleware/authMiddleware'); // Middleware for authentication
const tenantResolverMiddleware = require('../middleware/tenantResolverMiddleware'); // Middleware to resolve tenant ID

const router = express.Router(); // Create a new Express router instance

// Apply authentication and tenant resolution middleware to ALL subsequent routes in this router.
// This ensures that every request to these routes is authenticated and has a tenant ID resolved.
router.use(authMiddleware, tenantResolverMiddleware); 

/**
 * @route GET /api/expense-categories
 * @description Get all expense categories for the authenticated tenant.
 * @access Private (requires authentication and tenant resolution)
 */
router.get('/', expenseCategoryController.getAllExpenseCategories);

/**
 * @route GET /api/expense-categories/:id
 * @description Get a single expense category by ID for the authenticated tenant.
 * @access Private (requires authentication and tenant resolution)
 */
router.get('/:id', expenseCategoryController.getExpenseCategoryById);

/**
 * @route POST /api/expense-categories
 * @description Create a new expense category for the authenticated tenant.
 * @access Private (requires authentication and tenant resolution)
 */
router.post('/', expenseCategoryController.createExpenseCategory);

/**
 * @route PUT /api/expense-categories/:id
 * @description Update an existing expense category by ID for the authenticated tenant.
 * @access Private (requires authentication and tenant resolution)
 */
router.put('/:id', expenseCategoryController.updateExpenseCategory);

/**
 * @route DELETE /api/expense-categories/:id
 * @description Delete an expense category by ID for the authenticated tenant.
 * @access Private (requires authentication and tenant resolution)
 */
router.delete('/:id', expenseCategoryController.deleteExpenseCategory);

module.exports = router; // Export the router to be used in the main application file
