// routes/promos.js
const express = require('express');
const promoController = require('../controllers/promoController');
const authMiddleware = require('../middleware/authMiddleware'); // Essential for authentication
const tenantResolverMiddleware = require('../middleware/tenantResolverMiddleware');

const router = express.Router();

// Apply authentication and tenant resolution middleware to ALL subsequent routes in this router.
router.use(authMiddleware, tenantResolverMiddleware);

// All routes below this point will automatically have authMiddleware and tenantResolverMiddleware applied.

// Get all promos
router.get('/', promoController.getAllPromos);

// Get a single promo by ID
router.get('/:id', promoController.getPromoById);

// Create a new promo
router.post('/', promoController.createPromo);

// Update an existing promo
router.put('/:id', promoController.updatePromo);

// Delete a promo
router.delete('/:id', promoController.deletePromo);

module.exports = router;