// routes/taxes.js
const express = require('express');
const router = express.Router();
const taxController = require('../controllers/taxController');
const { getTempTenantId } = require('../middleware/tempTenantMiddleware'); // <--- IMPORT the tenant middleware

// GET /rates - Get a list of available tax rates
router.get('/rates', getTempTenantId, taxController.getTaxRates); // Added getTempTenantId

// POST /calculate - Calculate tax for a given amount and rate
router.post('/calculate', getTempTenantId, taxController.calculateTax); // Added getTempTenantId

// You can add more routes for other tax-related operations as needed:

// GET /rules - Get a list of all tax rules
// router.get('/rules', taxController.getTaxRules);

// GET /rules/:id - Get a specific tax rule by ID
// router.get('/rules/:id', taxController.getTaxRuleById);

// POST /rules - Create a new tax rule
// router.post('/rules', taxController.createTaxRule);

// PUT /rules/:id - Update an existing tax rule by ID
// router.put('/rules/:id', taxController.updateTaxRule);

// DELETE /rules/:id - Delete a tax rule by ID
// router.delete('/rules/:id', taxController.deleteTaxRule);

module.exports = router;