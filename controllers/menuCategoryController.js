// controllers/menuCategoryController.js
const MenuCategory = require('../models/MenuCategory');

exports.getAllMenuCategories = async (req, res) => {
  try {
    const categories = await MenuCategory.findAll();
    res.status(200).json({
      status: 'success',
      count: categories.length,
      data: categories,
    });
  } catch (err) {
    console.error('Error getting all menu categories:', err);
    res.status(500).json({
      status: 'error',
      message: 'Failed to retrieve menu categories',
    });
  }
};

exports.getMenuCategoryById = async (req, res) => {
  try {
    const category = await MenuCategory.findById(req.params.id);
    if (!category) {
      return res.status(404).json({
        status: 'error',
        message: 'Menu category not found',
      });
    }
    res.status(200).json({
      status: 'success',
      data: category,
    });
  } catch (err) {
    console.error(`Error getting menu category ${req.params.id}:`, err);
    res.status(500).json({
      status: 'error',
      message: 'Failed to retrieve menu category',
    });
  }
};

exports.createMenuCategory = async (req, res) => {
  try {
    const newCategory = await MenuCategory.create(req.body);
    res.status(201).json({
      status: 'success',
      data: newCategory,
    });
  } catch (err) {
    console.error('Error creating menu category:', err);
    res.status(500).json({
      status: 'error',
      message: 'Failed to create menu category',
    });
  }
};

exports.updateMenuCategory = async (req, res) => {
  try {
    const updatedCategory = await MenuCategory.update(req.params.id, req.body);
    if (!updatedCategory) {
      return res.status(404).json({
        status: 'error',
        message: 'Menu category not found',
      });
    }
    res.status(200).json({
      status: 'success',
      data: updatedCategory,
    });
  } catch (err) {
    console.error(`Error updating menu category ${req.params.id}:`, err);
    res.status(500).json({
      status: 'error',
      message: 'Failed to update menu category',
    });
  }
};

exports.deleteMenuCategory = async (req, res) => {
  try {
    // Choose between softDelete or permanent delete based on your application's needs
    const deletedCategory = await MenuCategory.softDelete(req.params.id); // Or MenuCategory.delete(req.params.id);
    if (!deletedCategory) {
      return res.status(404).json({
        status: 'error',
        message: 'Menu category not found',
      });
    }
    res.status(200).json({
      status: 'success',
      message: 'Menu category deleted successfully (or set to not displayed)',
    });
  } catch (err) {
    console.error(`Error deleting menu category ${req.params.id}:`, err);
    res.status(500).json({
      status: 'error',
      message: 'Failed to delete menu category',
    });
  }
};