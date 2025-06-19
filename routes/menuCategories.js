// routes/menuCategories.js
const express = require('express');
const menuCategoryController = require('../controllers/menuCategoryController');
const upload = require('../middleware/upload'); // Import your multer middleware
const authMiddleware = require('../middleware/authMiddleware'); // Essential for authentication
const tenantResolverMiddleware = require('../middleware/tenantResolverMiddleware'); 

const router = express.Router();

// Get all menu categories for a specific tenant
router.get('/', authMiddleware, tenantResolverMiddleware, menuCategoryController.getAllMenuCategories); // <--- ADDED getTempTenantId

// Get a single menu category by ID for a specific tenant
router.get('/:id', authMiddleware, tenantResolverMiddleware, menuCategoryController.getMenuCategoryById); // <--- ADDED getTempTenantId

// Create a new menu category for a specific tenant
router.post('/', authMiddleware, tenantResolverMiddleware, upload.single('image'), menuCategoryController.createMenuCategory); // <--- ADDED getTempTenantId

// Update an existing menu category for a specific tenant
router.put('/:id', authMiddleware, tenantResolverMiddleware, upload.single('image'), menuCategoryController.updateMenuCategory); // <--- ADDED getTempTenantId

// Delete a menu category for a specific tenant
router.delete('/:id', authMiddleware, tenantResolverMiddleware, menuCategoryController.deleteMenuCategory); // <--- ADDED getTempTenantId

module.exports = router;