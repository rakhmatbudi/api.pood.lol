// routes/revenueCategories.js
const express = require('express');
const revenueCategoryController = require('../controllers/revenueCategoryController'); // Import the revenue category controller
const authMiddleware = require('../middleware/authMiddleware'); // Middleware for authentication
const tenantResolverMiddleware = require('../middleware/tenantResolverMiddleware'); // Middleware to resolve tenant ID

const router = express.Router(); // Create a new Express router instance

// Apply authentication and tenant resolution middleware to ALL subsequent routes in this router.
// This ensures that every request to these routes is authenticated and has a tenant ID resolved.
router.use(authMiddleware, tenantResolverMiddleware); 

/**
 * @route GET /api/revenue-categories
 * @description Get all revenue categories for the authenticated tenant.
 * @access Private (requires authentication and tenant resolution)
 */
router.get('/', revenueCategoryController.getAllRevenueCategories);

/**
 * @route GET /api/revenue-categories/:id
 * @description Get a single revenue category by ID for the authenticated tenant.
 * @access Private (requires authentication and tenant resolution)
 */
router.get('/:id', revenueCategoryController.getRevenueCategoryById);

/**
 * @route POST /api/revenue-categories
 * @description Create a new revenue category for the authenticated tenant.
 * @access Private (requires authentication and tenant resolution)
 */
router.post('/', revenueCategoryController.createRevenueCategory);

/**
 * @route PUT /api/revenue-categories/:id
 * @description Update an existing revenue category by ID for the authenticated tenant.
 * @access Private (requires authentication and tenant resolution)
 */
router.put('/:id', revenueCategoryController.updateRevenueCategory);

/**
 * @route DELETE /api/revenue-categories/:id
 * @description Delete a revenue category by ID for the authenticated tenant.
 * @access Private (requires authentication and tenant resolution)
 */
router.delete('/:id', revenueCategoryController.deleteRevenueCategory);

module.exports = router; // Export the router to be used in the main application file
