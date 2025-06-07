// routes/menuItems.js
const express = require('express');
const menuItemController = require('../controllers/menuItemController');

const router = express.Router();

// Place more specific routes BEFORE more general ones.

// GET all menu items (this is a general route, but often comes first for readability)
router.get('/', menuItemController.getAllMenuItems);

// POST a new menu item
router.post('/', menuItemController.createMenuItem);

// GET a single menu item by ID (This is now correctly placed after the general '/' route)
router.get('/:id', menuItemController.getMenuItemById);

// UPDATE an existing menu item by ID
router.put('/:id', menuItemController.updateMenuItem);

// DELETE a menu item by ID
router.delete('/:id', menuItemController.deleteMenuItem);

module.exports = router;