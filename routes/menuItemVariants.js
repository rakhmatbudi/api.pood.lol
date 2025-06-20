// routes/menuItemVariants.js
const express = require('express');
const router = express.Router();
const menuItemVariantController = require('../controllers/menuItemVariantController');
const authMiddleware = require('../middleware/authMiddleware'); // Essential for authentication
const tenantResolverMiddleware = require('../middleware/tenantResolverMiddleware');

// Apply authentication and tenant resolution middleware to ALL subsequent routes in this router.
router.use(authMiddleware, tenantResolverMiddleware);

// All routes below this point will automatically have authMiddleware and tenantResolverMiddleware applied.

// GET all menu item variants
router.get('/', menuItemVariantController.getAllMenuItemVariants);

// GET a single menu item variant by ID
router.get('/:id', menuItemVariantController.getMenuItemVariantById);

// GET all menu item variants for a specific menu item
router.get('/menu-item/:menuItemId', menuItemVariantController.getMenuItemVariantsByMenuItemId);

// POST a new menu item variant
router.post('/', menuItemVariantController.createMenuItemVariant);

// UPDATE an existing menu item variant by ID
router.put('/:id', menuItemVariantController.updateMenuItemVariant);

// DELETE a menu item variant by ID
router.delete('/:id', menuItemVariantController.deleteMenuItemVariant);

module.exports = router;