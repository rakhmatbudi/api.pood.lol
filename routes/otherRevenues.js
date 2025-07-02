// routes/otherRevenues.js
const express = require('express');
const otherRevenueController = require('../controllers/otherRevenueController'); // Import the other revenue controller
const authMiddleware = require('../middleware/authMiddleware'); // Middleware for authentication
const tenantResolverMiddleware = require('../middleware/tenantResolverMiddleware'); // Middleware to resolve tenant ID

const router = express.Router(); // Create a new Express router instance

// Apply authentication and tenant resolution middleware to ALL subsequent routes defined in this router.
// This ensures that every request to these routes is authenticated and has a tenant ID resolved.
router.use(authMiddleware, tenantResolverMiddleware);

// All routes defined below this point will automatically have authMiddleware and tenantResolverMiddleware applied.

/**
 * @route GET /api/other-revenues
 * @description Get all other revenue entries for the authenticated tenant.
 * @access Private (requires authentication and tenant resolution)
 */
router.get('/', otherRevenueController.getAllOtherRevenues);

/**
 * @route GET /api/other-revenues/:id
 * @description Get a single other revenue entry by ID for the authenticated tenant.
 * @access Private (requires authentication and tenant resolution)
 */
router.get('/:id', otherRevenueController.getOtherRevenueById);

/**
 * @route POST /api/other-revenues
 * @description Create a new other revenue entry for the authenticated tenant.
 * @access Private (requires authentication and tenant resolution)
 */
router.post('/', otherRevenueController.createOtherRevenue);

/**
 * @route PUT /api/other-revenues/:id
 * @description Update an existing other revenue entry by ID for the authenticated tenant.
 * @access Private (requires authentication and tenant resolution)
 */
router.put('/:id', otherRevenueController.updateOtherRevenue);

/**
 * @route DELETE /api/other-revenues/:id
 * @description Delete an other revenue entry by ID for the authenticated tenant.
 * @access Private (requires authentication and tenant resolution)
 */
router.delete('/:id', otherRevenueController.deleteOtherRevenue);

module.exports = router; // Export the router to be used in the main application file
