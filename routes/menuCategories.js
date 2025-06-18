// routes/menuCategories.js
const express = require('express');
const menuCategoryController = require('../controllers/menuCategoryController');
const upload = require('../middleware/upload'); // Import your multer middleware
const { getTempTenantId } = require('../middleware/tempTenantMiddleware'); // <--- ADDED: Import the tenant middleware

const router = express.Router();

// Get all menu categories for a specific tenant
router.get('/', getTempTenantId, menuCategoryController.getAllMenuCategories); // <--- ADDED getTempTenantId

// Get a single menu category by ID for a specific tenant
router.get('/:id', getTempTenantId, menuCategoryController.getMenuCategoryById); // <--- ADDED getTempTenantId

// Create a new menu category for a specific tenant
router.post('/', getTempTenantId, upload.single('image'), menuCategoryController.createMenuCategory); // <--- ADDED getTempTenantId

// Update an existing menu category for a specific tenant
router.put('/:id', getTempTenantId, upload.single('image'), menuCategoryController.updateMenuCategory); // <--- ADDED getTempTenantId

// Delete a menu category for a specific tenant
router.delete('/:id', getTempTenantId, menuCategoryController.deleteMenuCategory); // <--- ADDED getTempTenantId

module.exports = router;