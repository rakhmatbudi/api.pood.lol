// controllers/menuItemController.js
const MenuItem = require('../models/MenuItem');
const cloudinary = require('../config/cloudinary');
const fs = require('fs/promises');

exports.getAllMenuItems = async (req, res) => {
    try {
        const includeInactive = req.query.includeInactive === 'true';
        const menuItems = await MenuItem.findAll(includeInactive);
        res.status(200).json({ status: 'success', data: menuItems });
    } catch (error) {
        console.error('Error fetching menu items:', error);
        res.status(500).json({ status: 'error', message: 'Failed to fetch menu items', error: error.message });
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
        res.status(500).json({ status: 'error', message: 'Failed to fetch menu item', error: error.message });
    }
};

// New controller function
exports.getMenuItemsByCategoryId = async (req, res) => {
    const { categoryId } = req.params;
    try {
        const includeInactive = req.query.includeInactive === 'true';
        const menuItems = await MenuItem.findByCategoryId(categoryId, includeInactive);
        res.status(200).json({ status: 'success', data: menuItems });
    } catch (error) {
        console.error(`Error fetching menu items for category ${categoryId}:`, error);
        res.status(500).json({ status: 'error', message: `Failed to fetch menu items for category ${categoryId}`, error: error.message });
    }
};


exports.createMenuItem = async (req, res) => {
    let image_path = null;
    const localFilePath = req.file ? req.file.path : null;

    try {
        const { name, description, price, category_id, is_active } = req.body;

        if (localFilePath) {
            try {
                const uploadResult = await cloudinary.uploader.upload(localFilePath, {
                    folder: 'Pood/00000001/Product',
                    public_id: `${name.replace(/\s+/g, '_').toLowerCase()}_${Date.now()}`
                });
                image_path = uploadResult.secure_url;
            } catch (uploadError) {
                console.error('Cloudinary upload error:', uploadError);
                return res.status(500).json({ 
                    status: 'error', 
                    message: 'Failed to upload image to Cloudinary', 
                    error: uploadError.message 
                });
            } finally {
                try {
                    await fs.unlink(localFilePath);
                } catch (unlinkError) {
                    console.error('Failed to delete local temp file:', unlinkError);
                }
            }
        }

        const menuItemData = {
            name,
            description,
            price,
            category_id: parseInt(category_id),
            is_active: is_active === 'true',
            image_path
        };

        const newMenuItem = await MenuItem.create(menuItemData);
        res.status(201).json({ status: 'success', data: newMenuItem });
    } catch (error) {
        console.error('Error creating menu item:', error);
        
        if (localFilePath) {
            try {
                await fs.unlink(localFilePath);
            } catch (cleanupError) {
                console.error('Failed to cleanup file after error:', cleanupError);
            }
        }
        
        if (error.message.includes('Invalid file type') || error.message.includes('File too large')) {
             return res.status(400).json({ status: 'error', message: error.message });
        }
        res.status(500).json({ status: 'error', message: 'Failed to create menu item', error: error.message });
    }
};

exports.updateMenuItem = async (req, res) => {
    const { id } = req.params;
    let image_path = null;
    const localFilePath = req.file ? req.file.path : null;

    try {
        const { name, description, price, category_id, is_active } = req.body;

        const existingMenuItem = await MenuItem.findById(id);
        if (!existingMenuItem) {
            return res.status(404).json({ status: 'error', message: 'Menu item not found' });
        }
        image_path = existingMenuItem.image_path;

        if (localFilePath) {
            try {
                if (existingMenuItem.image_path) {
                    const urlParts = existingMenuItem.image_path.split('/');
                    // A more robust way to get public_id
                    const publicId = urlParts.slice(urlParts.indexOf('upload') + 2).join('/').split('.')[0];
                    
                    await cloudinary.uploader.destroy(publicId).catch(err => {
                        console.warn('Could not delete old image from Cloudinary:', err);
                    });
                }

                const uploadResult = await cloudinary.uploader.upload(localFilePath, {
                    folder: 'Pood/00000001/Product',
                    public_id: `${name ? name.replace(/\s+/g, '_').toLowerCase() : id}_${Date.now()}`
                });
                image_path = uploadResult.secure_url;
            } catch (uploadError) {
                console.error('Cloudinary upload error during update:', uploadError);
                return res.status(500).json({ 
                    status: 'error', 
                    message: 'Failed to upload new image', 
                    error: uploadError.message 
                });
            } finally {
                try {
                    await fs.unlink(localFilePath);
                } catch (unlinkError) {
                    console.error('Failed to delete local temp file:', unlinkError);
                }
            }
        } else if (req.body.image_path === null || req.body.image_path === '') {
            if (existingMenuItem.image_path) {
                const urlParts = existingMenuItem.image_path.split('/');
                // A more robust way to get public_id
                const publicId = urlParts.slice(urlParts.indexOf('upload') + 2).join('/').split('.')[0];
                
                await cloudinary.uploader.destroy(publicId).catch(err => {
                    console.warn('Could not delete old image from Cloudinary (clear request):', err);
                });
            }
            image_path = null;
        }

        const menuItemData = {
            name,
            description,
            price,
            category_id: category_id ? parseInt(category_id) : existingMenuItem.category_id,
            is_active: is_active !== undefined ? (is_active === 'true') : existingMenuItem.is_active,
            image_path
        };

        const updatedMenuItem = await MenuItem.update(id, menuItemData);
        res.status(200).json({ status: 'success', data: updatedMenuItem });
    } catch (error) {
        console.error('Error updating menu item:', error);
        
        if (localFilePath) {
            try {
                await fs.unlink(localFilePath);
            } catch (cleanupError) {
                console.error('Failed to cleanup file after error:', cleanupError);
            }
        }
        
        res.status(500).json({ status: 'error', message: 'Failed to update menu item', error: error.message });
    }
};

exports.deleteMenuItem = async (req, res) => {
    const { id } = req.params;
    try {
        const menuItem = await MenuItem.findById(id);
        if (menuItem && menuItem.image_path) {
            const urlParts = menuItem.image_path.split('/');
            // A more robust way to get public_id
            const publicId = urlParts.slice(urlParts.indexOf('upload') + 2).join('/').split('.')[0];
            
            try {
                await cloudinary.uploader.destroy(publicId);
            } catch (cloudinaryDeleteError) {
                console.warn('Could not delete image from Cloudinary:', cloudinaryDeleteError);
            }
        }

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