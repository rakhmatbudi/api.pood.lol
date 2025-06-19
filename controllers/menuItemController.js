// controllers/menuItemController.js
const MenuItem = require('../models/MenuItem');
const cloudinary = require('../config/cloudinary');
const fs = require('fs/promises');

// Helper function to extract Cloudinary public ID, adjusted for tenant-specific folders
const getCloudinaryPublicId = (imageUrl, tenant) => {
    if (!imageUrl || !tenant) return null;
    try {
        // Construct the expected base folder path for this tenant
        const tenantFolderPath = `Pood/${tenant}/Product/`;
        // Find the index of the tenant-specific folder path in the URL
        const folderIndex = imageUrl.indexOf(tenantFolderPath);
        if (folderIndex === -1) {
            console.warn(`Cloudinary URL '${imageUrl}' does not contain expected tenant folder '${tenantFolderPath}'`);
            return null;
        }
        // Extract the part of the URL that follows the tenant-specific folder path
        const publicIdWithExtension = imageUrl.substring(folderIndex + tenantFolderPath.length);
        // Remove the file extension
        return publicIdWithExtension.split('.')[0];
    } catch (e) {
        console.error('Error extracting Cloudinary public ID:', e);
        return null;
    }
};

exports.getAllMenuItems = async (req, res) => {
    try {
        const tenant = req.tenant;
        if (!tenant) {
            return res.status(400).json({ status: 'error', message: 'Tenant ID is required.' });
        }

        const includeInactive = req.query.includeInactive === 'true';
        // Pass tenant to the model method
        const menuItems = await MenuItem.findAll(tenant, includeInactive);
        res.status(200).json({ status: 'success', data: menuItems });
    } catch (error) {
        console.error('Error fetching menu items:', error);
        res.status(500).json({ status: 'error', message: 'Failed to fetch menu items', error: error.message });
    }
};

exports.getMenuItemById = async (req, res) => {
    const { id } = req.params;
    try {
        const tenant = req.tenant;
        if (!tenant) {
            return res.status(400).json({ status: 'error', message: 'Tenant ID is required.' });
        }

        // Pass tenant to the model method
        const menuItem = await MenuItem.findById(id, tenant);
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
        const tenant = req.tenant;
        if (!tenant) {
            return res.status(400).json({ status: 'error', message: 'Tenant ID is required.' });
        }

        const includeInactive = req.query.includeInactive === 'true';
        // Pass tenant to the model method
        const menuItems = await MenuItem.findByCategoryId(categoryId, tenant, includeInactive);
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
        const tenant = req.tenant;
        if (!tenant) {
            return res.status(400).json({ status: 'error', message: 'Tenant ID is required.' });
        }

        const { name, description, price, category_id, is_active } = req.body;

        if (localFilePath) {
            try {
                // Cloudinary folder is now tenant-specific
                const uploadResult = await cloudinary.uploader.upload(localFilePath, {
                    folder: `Pood/${tenant}/Product`, // Dynamic folder based on tenant
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
            is_active: typeof is_active === 'boolean' ? is_active : is_active === 'true',
            image_path,
            tenant: tenant // Add tenant to the data for creation
        };

        // Pass tenant (contained within menuItemData) to the model method
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
        const tenant = req.tenant;
        if (!tenant) {
            return res.status(400).json({ status: 'error', message: 'Tenant ID is required.' });
        }

        const { name, description, price, category_id, is_active } = req.body;

        // Fetch existing menu item, ensuring it belongs to the current tenant
        const existingMenuItem = await MenuItem.findById(id, tenant);
        if (!existingMenuItem) {
            return res.status(404).json({ status: 'error', message: 'Menu item not found for this tenant.' });
        }
        image_path = existingMenuItem.image_path; // Keep existing image path by default

        if (localFilePath) {
            try {
                // Delete old image from Cloudinary, ensure tenant-specific deletion
                if (existingMenuItem.image_path) {
                    const publicId = getCloudinaryPublicId(existingMenuItem.image_path, tenant);
                    if (publicId) {
                        await cloudinary.uploader.destroy(publicId).catch(err => {
                            console.warn('Could not delete old image from Cloudinary (update):', err);
                        });
                    }
                }

                // Upload new image to tenant-specific folder
                const uploadResult = await cloudinary.uploader.upload(localFilePath, {
                    folder: `Pood/${tenant}/Product`, // Dynamic folder based on tenant
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
            // If image_path is explicitly set to null/empty in body, delete existing
            if (existingMenuItem.image_path) {
                const publicId = getCloudinaryPublicId(existingMenuItem.image_path, tenant);
                if (publicId) {
                    await cloudinary.uploader.destroy(publicId).catch(err => {
                        console.warn('Could not delete old image from Cloudinary (clear request):', err);
                    });
                }
            }
            image_path = null;
        }

        const menuItemData = {
            name,
            description,
            price,
            category_id: category_id ? parseInt(category_id) : existingMenuItem.category_id,
            is_active: is_active !== undefined ?
                (typeof is_active === 'boolean' ? is_active : is_active === 'true') :
                existingMenuItem.is_active,
            image_path
        };

        // Pass tenant to the model method for update
        const updatedMenuItem = await MenuItem.update(id, menuItemData, tenant);
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
        const tenant = req.tenant;
        if (!tenant) {
            return res.status(400).json({ status: 'error', message: 'Tenant ID is required.' });
        }

        // Fetch menu item, ensuring it belongs to the current tenant
        const menuItem = await MenuItem.findById(id, tenant);
        if (!menuItem) {
            return res.status(404).json({ status: 'error', message: 'Menu item not found for this tenant.' });
        }

        // Delete image from Cloudinary if it exists, ensuring tenant-specific deletion
        if (menuItem.image_path) {
            const publicId = getCloudinaryPublicId(menuItem.image_path, tenant);
            if (publicId) {
                try {
                    await cloudinary.uploader.destroy(publicId);
                } catch (cloudinaryDeleteError) {
                    console.warn('Could not delete image from Cloudinary:', cloudinaryDeleteError);
                }
            }
        }

        // Delete menu item from DB, ensuring tenant-specific deletion
        const deletedMenuItem = await MenuItem.delete(id, tenant);
        if (deletedMenuItem) {
            res.status(200).json({ status: 'success', data: deletedMenuItem });
        } else {
            // This else block might not be reached if findById already caught it,
            // but kept for robustness if DB delete fails for other reasons (e.g., integrity constraint)
            res.status(404).json({ status: 'error', message: 'Menu item not found or could not be deleted.' });
        }
    } catch (error) {
        console.error('Error deleting menu item:', error);
        res.status(500).json({ status: 'error', message: 'Failed to delete menu item', error: error.message });
    }
};

module.exports = exports;