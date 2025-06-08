const MenuItem = require('../models/MenuItem');
const cloudinary = require('../config/cloudinary'); // Import configured Cloudinary
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

exports.createMenuItem = async (req, res) => {
    let image_path = null;
    const localFilePath = req.file ? req.file.path : null;

    console.log('🔍 Incoming file (req.file):', req.file);
    console.log('🔍 Local file path for Cloudinary:', localFilePath);

    try {
        const { name, description, price, category_id, is_active } = req.body;

        // DEBUG: Log form data
        console.log('🔍 Form data received:', {
            name,
            description,
            price,
            category_id,
            is_active
        });

        if (localFilePath) {
            console.log('🚀 Starting Cloudinary upload from:', localFilePath);
            
            try {
                const uploadResult = await cloudinary.uploader.upload(localFilePath, {
                    folder: 'Pood/00000001/Product',
                    public_id: `${name.replace(/\s+/g, '_').toLowerCase()}_${Date.now()}`
                });
                console.log('✅ Cloudinary upload successful:', uploadResult.secure_url);
                image_path = uploadResult.secure_url;
            } catch (uploadError) {
                console.error('❌ Cloudinary upload error:', uploadError);
                return res.status(500).json({ 
                    status: 'error', 
                    message: 'Failed to upload image to Cloudinary', 
                    error: uploadError.message 
                });
            } finally {
                // Always delete the temporary file after upload (success or failure)
                try {
                    await fs.unlink(localFilePath);
                    console.log('🗑️ Temporary file deleted:', localFilePath);
                } catch (unlinkError) {
                    console.error('⚠️ Failed to delete local temp file:', unlinkError);
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

        console.log('🔍 Creating menu item with data:', menuItemData);

        const newMenuItem = await MenuItem.create(menuItemData);
        console.log('✅ Menu item created successfully:', newMenuItem);
        
        res.status(201).json({ status: 'success', data: newMenuItem });
    } catch (error) {
        console.error('❌ Error creating menu item:', error);
        
        // Clean up file if there was an error and file still exists
        if (localFilePath) {
            try {
                await fs.unlink(localFilePath);
                console.log('🗑️ Cleaned up temporary file after error');
            } catch (cleanupError) {
                console.error('⚠️ Failed to cleanup file after error:', cleanupError);
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
    
    console.log('🔍 Incoming file (req.file):', req.file);
    console.log('🔍 Local file path for Cloudinary:', localFilePath);

    try {
        const { name, description, price, category_id, is_active } = req.body;

        // First, get the existing menu item to potentially delete the old image
        const existingMenuItem = await MenuItem.findById(id);
        if (!existingMenuItem) {
            return res.status(404).json({ status: 'error', message: 'Menu item not found' });
        }
        image_path = existingMenuItem.image_path; // Default to existing image path

        // Check if a new file was uploaded
        if (localFilePath) {
            console.log('🚀 Starting Cloudinary upload for update from:', localFilePath);
            
            try {
                // If there's an old image, delete it from Cloudinary first
                if (existingMenuItem.image_path) {
                    console.log('🗑️ Deleting old image from Cloudinary:', existingMenuItem.image_path);
                    const urlParts = existingMenuItem.image_path.split('/');
                    const publicIdWithExtension = urlParts.slice(-2).join('/'); // folder/filename.ext
                    const publicId = publicIdWithExtension.split('.')[0]; // remove extension
                    
                    await cloudinary.uploader.destroy(publicId).catch(err => {
                        console.warn('⚠️ Could not delete old image from Cloudinary:', err);
                    });
                }

                // Upload new image to Cloudinary
                const uploadResult = await cloudinary.uploader.upload(localFilePath, {
                    folder: 'Pood/00000001/Product',
                    public_id: `${name ? name.replace(/\s+/g, '_').toLowerCase() : id}_${Date.now()}`
                });
                console.log('✅ Cloudinary upload successful:', uploadResult.secure_url);
                image_path = uploadResult.secure_url;
            } catch (uploadError) {
                console.error('❌ Cloudinary upload error during update:', uploadError);
                return res.status(500).json({ 
                    status: 'error', 
                    message: 'Failed to upload new image', 
                    error: uploadError.message 
                });
            } finally {
                // Always delete the temporary file
                try {
                    await fs.unlink(localFilePath);
                    console.log('🗑️ Temporary file deleted:', localFilePath);
                } catch (unlinkError) {
                    console.error('⚠️ Failed to delete local temp file:', unlinkError);
                }
            }
        } else if (req.body.image_path === null || req.body.image_path === '') {
            // Case where client explicitly sends image_path as null/empty to clear the image
            if (existingMenuItem.image_path) {
                console.log('🗑️ Clearing image from Cloudinary:', existingMenuItem.image_path);
                const urlParts = existingMenuItem.image_path.split('/');
                const publicIdWithExtension = urlParts.slice(-2).join('/');
                const publicId = publicIdWithExtension.split('.')[0];
                
                await cloudinary.uploader.destroy(publicId).catch(err => {
                    console.warn('⚠️ Could not delete old image from Cloudinary (clear request):', err);
                });
            }
            image_path = null;
        }

        // Prepare data for the model
        const menuItemData = {
            name,
            description,
            price,
            category_id: category_id ? parseInt(category_id) : existingMenuItem.category_id,
            is_active: is_active !== undefined ? (is_active === 'true') : existingMenuItem.is_active,
            image_path
        };

        console.log('🔍 Updating menu item with data:', menuItemData);

        const updatedMenuItem = await MenuItem.update(id, menuItemData);
        console.log('✅ Menu item updated successfully:', updatedMenuItem);
        
        res.status(200).json({ status: 'success', data: updatedMenuItem });
    } catch (error) {
        console.error('❌ Error updating menu item:', error);
        
        // Clean up file if there was an error and file still exists
        if (localFilePath) {
            try {
                await fs.unlink(localFilePath);
                console.log('🗑️ Cleaned up temporary file after error');
            } catch (cleanupError) {
                console.error('⚠️ Failed to cleanup file after error:', cleanupError);
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
            console.log('🗑️ Deleting image from Cloudinary:', menuItem.image_path);
            const urlParts = menuItem.image_path.split('/');
            const publicIdWithExtension = urlParts.slice(-2).join('/'); // folder/filename.ext
            const publicId = publicIdWithExtension.split('.')[0]; // remove extension
            
            try {
                await cloudinary.uploader.destroy(publicId);
                console.log('✅ Deleted image from Cloudinary:', publicId);
            } catch (cloudinaryDeleteError) {
                console.warn('⚠️ Could not delete image from Cloudinary:', cloudinaryDeleteError);
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