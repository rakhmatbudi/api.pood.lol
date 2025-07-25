// routes/menuItems.js
const express = require('express');
const router = express.Router();
const menuItemController = require('../controllers/menuItemController');
const upload = require('../middleware/upload'); // IMPORT the configured Multer instance from middleware
const authMiddleware = require('../middleware/authMiddleware'); // Essential for authentication
const tenantResolverMiddleware = require('../middleware/tenantResolverMiddleware');

// Apply authentication and tenant resolution middleware to ALL subsequent routes in this router.
router.use(authMiddleware, tenantResolverMiddleware);

// All routes below this point will automatically have authMiddleware and tenantResolverMiddleware applied.

// There should be NO Multer configuration (storage, destination, filename, or multer() call) here!

// GET all menu items
router.get('/', menuItemController.getAllMenuItems);

// GET all menu items for a specific category
router.get('/category/:categoryId', menuItemController.getMenuItemsByCategoryId);

// POST a new menu item (using the imported 'upload' middleware)
router.post('/', upload.single('image'), menuItemController.createMenuItem);

// GET a single menu item by ID
router.get('/:id', menuItemController.getMenuItemById);

// UPDATE an existing menu item by ID (using the imported 'upload' middleware)
router.put('/:id', upload.single('image'), menuItemController.updateMenuItem);

// DELETE a menu item by ID
router.delete('/:id', menuItemController.deleteMenuItem);

module.exports = router;