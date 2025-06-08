// routes/menuCategories.js
const express = require('express');
const menuCategoryController = require('../controllers/menuCategoryController');
const upload = require('../middleware/upload'); // Add this line - import your multer middleware
const router = express.Router();

router.get('/', menuCategoryController.getAllMenuCategories);
router.get('/:id', menuCategoryController.getMenuCategoryById);
router.post('/', upload.single('image'), menuCategoryController.createMenuCategory); // Add multer middleware
router.put('/:id', upload.single('image'), menuCategoryController.updateMenuCategory); // Add multer middleware
router.delete('/:id', menuCategoryController.deleteMenuCategory);

module.exports = router;