// routes/menuCategories.js
const express = require('express');
const menuCategoryController = require('../controllers/menuCategoryController');
const upload = require('../middleware/upload'); // Import your multer middleware
const authMiddleware = require('../middleware/authMiddleware'); // Essential for authentication
const tenantResolverMiddleware = require('../middleware/tenantResolverMiddleware');

const router = express.Router();

// Apply authentication and tenant resolution middleware to ALL subsequent routes in this router.
router.use(authMiddleware, tenantResolverMiddleware);

// All routes below this point will automatically have authMiddleware and tenantResolverMiddleware applied.

// Get all menu categories for a specific tenant
router.get('/', menuCategoryController.getAllMenuCategories);

// Get a single menu category by ID for a specific tenant
router.get('/:id', menuCategoryController.getMenuCategoryById);

// Create a new menu category for a specific tenant (upload.single('image') remains here)
router.post('/', upload.single('image'), menuCategoryController.createMenuCategory);

// Update an existing menu category for a specific tenant (upload.single('image') remains here)
router.put('/:id', upload.single('image'), menuCategoryController.updateMenuCategory);

// Delete a menu category for a specific tenant
router.delete('/:id', menuCategoryController.deleteMenuCategory);

module.exports = router;