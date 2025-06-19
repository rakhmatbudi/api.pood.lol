// routes/promos.js
const express = require('express');
const promoController = require('../controllers/promoController');
const authMiddleware = require('../middleware/authMiddleware'); // Essential for authentication
const tenantResolverMiddleware = require('../middleware/tenantResolverMiddleware'); 

const router = express.Router();

// Get all promos
router.get('/', authMiddleware, tenantResolverMiddleware, promoController.getAllPromos); // Added getTempTenantId

// Get a single promo by ID
router.get('/:id', authMiddleware, tenantResolverMiddleware, promoController.getPromoById); // Added getTempTenantId

// Create a new promo
router.post('/', authMiddleware, tenantResolverMiddleware, promoController.createPromo); // Added getTempTenantId

// Update an existing promo
router.put('/:id', authMiddleware, tenantResolverMiddleware, promoController.updatePromo); // Added getTempTenantId

// Delete a promo
router.delete('/:id', authMiddleware, tenantResolverMiddleware, promoController.deletePromo); // Added getTempTenantId

module.exports = router;