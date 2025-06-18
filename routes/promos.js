// routes/promos.js
const express = require('express');
const promoController = require('../controllers/promoController');
const { getTempTenantId } = require('../middleware/tempTenantMiddleware'); // <--- IMPORT the tenant middleware

const router = express.Router();

// Get all promos
router.get('/', getTempTenantId, promoController.getAllPromos); // Added getTempTenantId

// Get a single promo by ID
router.get('/:id', getTempTenantId, promoController.getPromoById); // Added getTempTenantId

// Create a new promo
router.post('/', getTempTenantId, promoController.createPromo); // Added getTempTenantId

// Update an existing promo
router.put('/:id', getTempTenantId, promoController.updatePromo); // Added getTempTenantId

// Delete a promo
router.delete('/:id', getTempTenantId, promoController.deletePromo); // Added getTempTenantId

module.exports = router;