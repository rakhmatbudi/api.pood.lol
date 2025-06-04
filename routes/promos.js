// routes/promos.js
const express = require('express');
const promoController = require('../controllers/promoController');

const router = express.Router();

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