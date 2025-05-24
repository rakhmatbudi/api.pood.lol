// routes/menuItems.js
const express = require('express');
const menuItemController = require('../controllers/menuItemController');

const router = express.Router();

// Place more specific routes BEFORE more general ones.

router.get('/', menuItemController.getAllMenuItems);
router.post('/', menuItemController.createMenuItem);
router.get('/:id', menuItemController.getMenuItemById); // <-- This is now below the specific route
router.put('/:id', menuItemController.updateMenuItem);
router.delete('/:id', menuItemController.deleteMenuItem);

module.exports = router;