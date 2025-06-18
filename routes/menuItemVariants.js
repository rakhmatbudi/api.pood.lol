// routes/menuItemVariants.js
const express = require('express');
const router = express.Router();
const menuItemVariantController = require('../controllers/menuItemVariantController');
const { getTempTenantId } = require('../middleware/tempTenantMiddleware'); // <--- IMPORT the tenant middleware

// GET all menu item variants
router.get('/', getTempTenantId, menuItemVariantController.getAllMenuItemVariants); // Added getTempTenantId

// GET a single menu item variant by ID
router.get('/:id', getTempTenantId, menuItemVariantController.getMenuItemVariantById); // Added getTempTenantId

// GET all menu item variants for a specific menu item
router.get('/menu-item/:menuItemId', getTempTenantId, menuItemVariantController.getMenuItemVariantsByMenuItemId); // Added getTempTenantId

// POST a new menu item variant
router.post('/', getTempTenantId, menuItemVariantController.createMenuItemVariant); // Added getTempTenantId

// UPDATE an existing menu item variant by ID
router.put('/:id', getTempTenantId, menuItemVariantController.updateMenuItemVariant); // Added getTempTenantId

// DELETE a menu item variant by ID
router.delete('/:id', getTempTenantId, menuItemVariantController.deleteMenuItemVariant); // Added getTempTenantId

module.exports = router;