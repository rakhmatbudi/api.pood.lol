// routes/menuItemVariants.js
const express = require('express');
const router = express.Router();
const menuItemVariantController = require('../controllers/menuItemVariantController');
const authMiddleware = require('../middleware/authMiddleware'); // Essential for authentication
const tenantResolverMiddleware = require('../middleware/tenantResolverMiddleware'); 

// GET all menu item variants
router.get('/', authMiddleware, tenantResolverMiddleware, menuItemVariantController.getAllMenuItemVariants); // Added getTempTenantId

// GET a single menu item variant by ID
router.get('/:id', authMiddleware, tenantResolverMiddleware, menuItemVariantController.getMenuItemVariantById); // Added getTempTenantId

// GET all menu item variants for a specific menu item
router.get('/menu-item/:menuItemId', authMiddleware, tenantResolverMiddleware, menuItemVariantController.getMenuItemVariantsByMenuItemId); // Added getTempTenantId

// POST a new menu item variant
router.post('/', authMiddleware, tenantResolverMiddleware, menuItemVariantController.createMenuItemVariant); // Added getTempTenantId

// UPDATE an existing menu item variant by ID
router.put('/:id', authMiddleware, tenantResolverMiddleware, menuItemVariantController.updateMenuItemVariant); // Added getTempTenantId

// DELETE a menu item variant by ID
router.delete('/:id', authMiddleware, tenantResolverMiddleware, menuItemVariantController.deleteMenuItemVariant); // Added getTempTenantId

module.exports = router;