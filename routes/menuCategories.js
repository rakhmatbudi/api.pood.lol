// routes/menuCategories.js
const express = require('express');
const menuCategoryController = require('../controllers/menuCategoryController');

const router = express.Router();

router.get('/', menuCategoryController.getAllMenuCategories);
router.get('/:id', menuCategoryController.getMenuCategoryById);
router.post('/', menuCategoryController.createMenuCategory);
router.put('/:id', menuCategoryController.updateMenuCategory);
router.delete('/:id', menuCategoryController.deleteMenuCategory);

module.exports = router;