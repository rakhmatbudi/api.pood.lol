// controllers/menuItemController.js
const MenuItem = require('../models/MenuItem');
// The MenuItemVariant import is not strictly necessary in the controller
// unless you're directly using its methods here for other purposes.
// It's used internally by MenuItem.findById, so it's not needed at this level.
// const MenuItemVariant = require('../models/MenuItemVariant'); // Remove if not directly used

exports.getAllMenuItems = async (req, res) => {
  try {
    // Extract the 'includeInactive' query parameter
    // It comes as a string, so convert it to a boolean
    const includeInactive = req.query.includeInactive === 'true';

    // Pass the boolean flag to the MenuItem.findAll model method
    const menuItems = await MenuItem.findAll(includeInactive);

    res.status(200).json({ status: 'success', data: menuItems });
  } catch (error) {
    console.error('Error fetching menu items:', error);
    // It's good practice to pass errors to the next middleware for global handling
    // or return a detailed message in development
    res.status(500).json({ status: 'error', message: 'Failed to fetch menu items', error: error.message });
  }
};

exports.getMenuItemById = async (req, res) => {
  const { id } = req.params;
  try {
    // Note: This still only fetches active menu items due to the model's findById implementation.
    // If you need to fetch inactive by ID, you'd need to modify MenuItem.findById
    // to accept a flag, or create a separate method in the model.
    const menuItem = await MenuItem.findById(id);
    if (menuItem) {
      res.status(200).json({ status: 'success', data: menuItem });
    } else {
      res.status(404).json({ status: 'error', message: 'Menu item not found' });
    }
  } catch (error) {
    console.error('Error fetching menu item by ID:', error);
    res.status(500).json({ status: 'error', message: 'Failed to fetch menu item', error: error.message });
  }
};

exports.createMenuItem = async (req, res) => {
  try {
    const newMenuItem = await MenuItem.create(req.body);
    res.status(201).json({ status: 'success', data: newMenuItem });
  } catch (error) {
    console.error('Error creating menu item:', error);
    res.status(500).json({ status: 'error', message: 'Failed to create menu item', error: error.message });
  }
};

exports.updateMenuItem = async (req, res) => {
  const { id } = req.params;
  try {
    const updatedMenuItem = await MenuItem.update(id, req.body);
    if (updatedMenuItem) {
      res.status(200).json({ status: 'success', data: updatedMenuItem });
    } else {
      res.status(404).json({ status: 'error', message: 'Menu item not found' });
    }
  } catch (error) {
    console.error('Error updating menu item:', error);
    res.status(500).json({ status: 'error', message: 'Failed to update menu item', error: error.message });
  }
};

exports.deleteMenuItem = async (req, res) => {
  const { id } = req.params;
  try {
    const deletedMenuItem = await MenuItem.delete(id);
    if (deletedMenuItem) {
      res.status(200).json({ status: 'success', data: deletedMenuItem });
    } else {
      res.status(404).json({ status: 'error', message: 'Menu item not found' });
    }
  } catch (error) {
    console.error('Error deleting menu item:', error);
    res.status(500).json({ status: 'error', message: 'Failed to delete menu item', error: error.message });
  }
};

module.exports = exports;