// routes/taxes.js
const express = require('express');
const router = express.Router();
const taxController = require('../controllers/taxController');
const authMiddleware = require('../middleware/authMiddleware'); // Essential for authentication
const tenantResolverMiddleware = require('../middleware/tenantResolverMiddleware');

// Apply authentication and tenant resolution middleware to ALL subsequent routes in this router.
router.use(authMiddleware, tenantResolverMiddleware);

// All routes below this point will automatically have authMiddleware and tenantResolverMiddleware applied.

// GET /rates - Get a list of available tax rates
router.get('/rates', taxController.getTaxRates);

// POST /calculate - Calculate tax for a given amount and rate
router.post('/calculate', taxController.calculateTax);

// Uncommented and updated routes for other tax-related operations:

// GET /rules - Get a list of all tax rules
router.get('/rules', taxController.getTaxRules);

// GET /rules/:id - Get a specific tax rule by ID
router.get('/rules/:id', taxController.getTaxRuleById);

// POST /rules - Create a new tax rule
router.post('/rules', taxController.createTaxRule);

// PUT /rules/:id - Update an existing tax rule by ID
router.put('/rules/:id', taxController.updateTaxRule);

// DELETE /rules/:id - Delete a tax rule by ID
router.delete('/rules/:id', taxController.deleteTaxRule);

module.exports = router;