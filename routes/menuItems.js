// routes/menuItems.js
const express = require('express');
const router = express.Router();
const menuItemController = require('../controllers/menuItemController');
const upload = require('../middleware/upload'); // <--- IMPORT the configured Multer instance from middleware
const { getTempTenantId } = require('../middleware/tempTenantMiddleware'); // <--- IMPORT the tenant middleware

// There should be NO Multer configuration (storage, destination, filename, or multer() call) here!

// GET all menu items
router.get('/', getTempTenantId, menuItemController.getAllMenuItems); // Added getTempTenantId

// GET all menu items for a specific category
router.get('/category/:categoryId', getTempTenantId, menuItemController.getMenuItemsByCategoryId); // Added getTempTenantId

// POST a new menu item (using the imported 'upload' middleware)
router.post('/', getTempTenantId, upload.single('image'), menuItemController.createMenuItem); // Added getTempTenantId

// GET a single menu item by ID
router.get('/:id', getTempTenantId, menuItemController.getMenuItemById); // Added getTempTenantId

// UPDATE an existing menu item by ID (using the imported 'upload' middleware)
router.put('/:id', getTempTenantId, upload.single('image'), menuItemController.updateMenuItem); // Added getTempTenantId

// DELETE a menu item by ID
router.delete('/:id', getTempTenantId, menuItemController.deleteMenuItem); // Added getTempTenantId

module.exports = router;