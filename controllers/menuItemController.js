// controllers/menuItemController.js
const MenuItem = require('../models/MenuItem');
const MenuItemVariant = require('../models/MenuItemVariant'); // <-- Add/confirm this import!

exports.getAllMenuItems = async (req, res) => {
  try {
    const menuItems = await MenuItem.findAll();
    res.status(200).json({ status: 'success', data: menuItems });
  } catch (error) {
    console.error('Error fetching menu items:', error);
    res.status(500).json({ status: 'error', message: 'Failed to fetch menu items' });
  }
};

exports.getMenuItemById = async (req, res) => {
  const { id } = req.params;
  try {
    const menuItem = await MenuItem.findById(id);
    if (menuItem) {
      res.status(200).json({ status: 'success', data: menuItem });
    } else {
      res.status(404).json({ status: 'error', message: 'Menu item not found' });
    }
  } catch (error) {
    console.error('Error fetching menu item by ID:', error);
    res.status(500).json({ status: 'error', message: 'Failed to fetch menu item' });
  }
};

exports.createMenuItem = async (req, res) => {
  try {
    const newMenuItem = await MenuItem.create(req.body);
    res.status(201).json({ status: 'success', data: newMenuItem });
  } catch (error) {
    console.error('Error creating menu item:', error);
    res.status(500).json({ status: 'error', message: 'Failed to create menu item' });
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
    res.status(500).json({ status: 'error', message: 'Failed to update menu item' });
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
    res.status(500).json({ status: 'error', message: 'Failed to delete menu item' });
  }
};

module.exports = exports;