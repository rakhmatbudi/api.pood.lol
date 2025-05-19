const express = require('express');
const menuItemController = require('../controllers/menuItemController');

const router = express.Router();

router.get('/', menuItemController.getAllMenuItems);
router.post('/', menuItemController.createMenuItem);
router.get('/:id', menuItemController.getMenuItemById);
router.put('/:id', menuItemController.updateMenuItem);
router.delete('/:id', menuItemController.deleteMenuItem);

module.exports = router;